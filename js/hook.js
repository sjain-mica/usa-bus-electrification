import { STATE_FIPS } from './utils.js';

const TOTAL = 29803;

// Invert STATE_FIPS: '01' → 'AL', etc.
const FIPS_STATE = Object.fromEntries(
  Object.entries(STATE_FIPS).map(([abbr, fips]) => [fips, abbr])
);

// Scroll timeline — fractions of total progress 0→1
// Scroller is 350vh; scrollable = 250vh. Constants scaled from 150vh baseline
// so pixel-scroll distances match the original 250vh design.
const TEXT_FADE_END   = 0.09;  // text fully gone (~22.5vh)
const BUS_ANIM_START  = 0.048; // buses begin moving (~12vh)
const BUS_ANIM_END    = 0.528; // buses reach final positions (~132vh)
const OVERLAY_START   = 0.60;  // overlay begins sliding up (~150vh)
const OVERLAY_END     = 0.88;  // overlay fully visible (~220vh)

export async function initHook(statesGeo, busData, nationalCosts) {
  const W = window.innerWidth;
  const H = window.innerHeight;

  const canvas = document.getElementById('hook-canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // --- Geo setup ---
  const nation = topojson.feature(statesGeo, statesGeo.objects.nation);
  const stateFeatures = topojson.feature(statesGeo, statesGeo.objects.states).features;

  const pad = 50;
  const projection = d3.geoAlbersUsa()
    .fitExtent([[pad, pad], [W - pad, H - pad]], nation);
  const geoPath = d3.geoPath().projection(projection);
  const canvasGeoPath = d3.geoPath().projection(projection).context(ctx);

  // --- Bus counts per state ---
  const busMap = new Map(busData.map(d => [d.state, +d.buses]));

  // --- Compute FINAL positions (inside state polygons, weighted by bus count) ---
  const fx = new Float32Array(TOTAL);
  const fy = new Float32Array(TOTAL);
  let idx = 0;

  for (const feature of stateFeatures) {
    const fips = String(feature.id).padStart(2, '0');
    const abbr = FIPS_STATE[fips];
    const count = busMap.get(abbr) || 0;
    if (!count) continue;

    const [[bx0, by0], [bx1, by1]] = geoPath.bounds(feature);
    const boxArea = (bx1 - bx0) * (by1 - by0);

    // Very small states (DC, RI, etc.): place at centroid with jitter
    if (boxArea < 80) {
      const [cx, cy] = geoPath.centroid(feature);
      let placed = 0;
      while (placed < count && idx < TOTAL) {
        fx[idx] = cx + (Math.random() - 0.5) * 6;
        fy[idx] = cy + (Math.random() - 0.5) * 4;
        idx++;
        placed++;
      }
      continue;
    }

    // Standard rejection sampling
    let placed = 0;
    let tries = 0;
    while (placed < count && idx < TOTAL && tries < count * 80) {
      tries++;
      const x = bx0 + Math.random() * (bx1 - bx0);
      const y = by0 + Math.random() * (by1 - by0);
      const ll = projection.invert([x, y]);
      if (ll && d3.geoContains(feature, ll)) {
        fx[idx] = x;
        fy[idx] = y;
        idx++;
        placed++;
      }
    }

    // Fallback: jitter from centroid if sampling ran out
    if (placed < count) {
      const [cx, cy] = geoPath.centroid(feature);
      while (placed < count && idx < TOTAL) {
        fx[idx] = cx + (Math.random() - 0.5) * 8;
        fy[idx] = cy + (Math.random() - 0.5) * 6;
        idx++;
        placed++;
      }
    }
  }

  // Safety net: fill any remaining
  while (idx < TOTAL) {
    const ref = Math.floor(Math.random() * idx);
    fx[idx] = fx[ref] + (Math.random() - 0.5) * 6;
    fy[idx] = fy[ref] + (Math.random() - 0.5) * 4;
    idx++;
  }

  // Sort final positions top→bottom so buses flow directionally into the map
  const sortOrder = Array.from({ length: TOTAL }, (_, i) => i)
    .sort((a, b) => fy[a] - fy[b]);
  const fxs = new Float32Array(TOTAL);
  const fys = new Float32Array(TOTAL);
  sortOrder.forEach((orig, neo) => { fxs[neo] = fx[orig]; fys[neo] = fy[orig]; });

  // --- Compute INITIAL positions: fill the full viewport ---
  // Solve for slot size so that rows×cols ≈ TOTAL and rows×slotH ≈ H, cols×slotW ≈ W
  const SLOT_RATIO = 1.5; // slotW / slotH (bus-shaped aspect ratio)
  const slotArea = (W * H) / TOTAL;
  const slotH = Math.sqrt(slotArea / SLOT_RATIO);
  const slotW = slotH * SLOT_RATIO;
  const cols  = Math.round(W / slotW);
  const rows  = Math.ceil(TOTAL / cols);
  const BW = Math.max(2, Math.round(slotW * 0.70)); // bus width (leaves a gap)
  const BH = Math.max(1, Math.round(slotH * 0.70)); // bus height

  // Center the grid in the viewport
  const gridW = cols * slotW;
  const gridH = rows * slotH;
  const gx0 = (W - gridW) / 2;
  const gy0 = (H - gridH) / 2;

  const ix = new Float32Array(TOTAL);
  const iy = new Float32Array(TOTAL);
  for (let i = 0; i < TOTAL; i++) {
    ix[i] = gx0 + (i % cols) * slotW + (slotW - BW) / 2;
    iy[i] = gy0 + Math.floor(i / cols) * slotH + (slotH - BH) / 2;
  }

  // --- Overlay ---
  const overlay = document.getElementById('hook-overlay');
  drawCostChart(nationalCosts[0]);

  // --- Scroll progress ---
  const scroller = document.getElementById('hook-scroller');
  let progress = 0;
  let lastProgress = -1;

  window.addEventListener('scroll', () => {
    const { top, height } = scroller.getBoundingClientRect();
    const scrollable = height - H;
    progress = scrollable > 0 ? Math.max(0, Math.min(1, -top / scrollable)) : 0;
  }, { passive: true });

  // --- Easing ---
  function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }

  // --- Render ---
  function draw() {
    requestAnimationFrame(draw);
    if (progress === lastProgress) return;
    lastProgress = progress;

    ctx.clearRect(0, 0, W, H);

    // Derived animation values
    const busT       = ease(clamp01((progress - BUS_ANIM_START) / (BUS_ANIM_END - BUS_ANIM_START)));
    const busOpacity = 0.4 + 0.6 * busT; // 40% → 100%
    const textAlpha  = clamp01(1 - progress / TEXT_FADE_END);
    const overlayT   = ease(clamp01((progress - OVERLAY_START) / (OVERLAY_END - OVERLAY_START)));
    overlay.style.transform = `translate(-50%, calc(-50% + ${(1 - overlayT) * 100}vh))`;

    // --- Draw buses ---
    ctx.fillStyle = 'rgb(255, 255, 255)'; // school bus yellow
    ctx.globalAlpha = busOpacity;

    for (let i = 0; i < TOTAL; i++) {
      const x = ix[i] + (fxs[i] - ix[i]) * busT;
      const y = iy[i] + (fys[i] - iy[i]) * busT;
      ctx.fillRect(x | 0, y | 0, BW, BH);
    }

    ctx.globalAlpha = 1;

    // --- Text overlay (centered, on top of buses) ---
    if (textAlpha > 0.01) {
      const fs = Math.min(W * 0.085, 100);
      const textCX = W / 2;
      const textCY = H / 2;

      // Radial vignette matching hook background
      const vigR = Math.min(W, H) * 0.58;
      const grad = ctx.createRadialGradient(textCX, textCY, 0, textCX, textCY, vigR);
      grad.addColorStop(0,   'rgba(0, 0, 0, 0.92)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.55)');
      grad.addColorStop(1,   'rgba(15, 23, 42, 0)');
      ctx.globalAlpha = textAlpha;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Main number
      ctx.globalAlpha = textAlpha;
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('29,803', textCX, textCY - fs * 0.08);

      // Subtitle
      ctx.globalAlpha = textAlpha * 0.65;
      ctx.fillStyle = '#ffffff';
      ctx.font = `400 ${Math.min(W * 0.018, 18)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
      ctx.fillText('diesel school buses operating across the US annually', textCX, textCY + fs * 0.68);
    }

    // --- Scroll cue (bottom center, fades immediately) ---
    const cueAlpha = clamp01(1 - progress * 12);
    if (cueAlpha > 0.01) {
      ctx.globalAlpha = cueAlpha * 0.38;
      ctx.fillStyle = '#ffffff';
      ctx.font = `500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↓  SCROLL', W / 2, H - 26);
    }

    ctx.globalAlpha = 1;
  }

  draw();
}

function drawCostChart({ total_impact, health_impact, climate_impact }) {
  const container = document.getElementById('hook-cost-chart');
  const W = container.getBoundingClientRect().width || Math.round(window.innerWidth * 0.3) - 64;
  const barH = 28;
  const labelW = 80;
  const valueW = 80;
  const barMaxW = W - labelW - valueW - 16;
  const rowGap = 20;
  const H = barH * 2 + rowGap + 24;

  const fmt = v => '$' + (v / 1e6).toFixed(0) + 'M';
  const pct = v => Math.round(v / total_impact * 100) + '%';

  const rows = [
    { label: 'Climate', value: climate_impact, color: '#00894b' },
    { label: 'Health',  value: health_impact,  color: '#2a8cb7' },
  ];

  const svg = d3.select(container).append('svg')
    .attr('width', W)
    .attr('height', H)
    .style('display', 'block');

  const g = svg.append('g').attr('transform', `translate(0, 12)`);

  rows.forEach((row, i) => {
    const y = i * (barH + rowGap);
    const barW = (row.value / total_impact) * barMaxW;

    const rg = g.append('g').attr('transform', `translate(0, ${y})`);

    // Label
    rg.append('text')
      .attr('x', 0).attr('y', barH / 2 + 1)
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'rgba(255,255,255,0.6)')
      .attr('font-size', '0.72rem')
      .attr('font-weight', '600')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif')
      .text(row.label.toUpperCase());

    // Background track
    rg.append('rect')
      .attr('x', labelW).attr('y', 0)
      .attr('width', barMaxW).attr('height', barH)
      .attr('rx', 4)
      .attr('fill', 'rgba(255,255,255,0.08)');

    // Filled bar
    rg.append('rect')
      .attr('x', labelW).attr('y', 0)
      .attr('width', barW).attr('height', barH)
      .attr('rx', 4)
      .attr('fill', row.color);

    // Percentage — centered inside bar, font scaled to fit
    const pctText = pct(row.value);
    const fontSize = Math.min(11, (barW - 8) / (pctText.length * 0.58));
    rg.append('text')
      .attr('x', labelW + barW / 2)
      .attr('y', barH / 2 + 1)
      .attr('dominant-baseline', 'middle')
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(0,0,0,0.8)')
      .attr('font-size', `${fontSize}px`)
      .attr('font-weight', '700')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif')
      .text(pctText);

    // Dollar value
    rg.append('text')
      .attr('x', labelW + barMaxW + 12).attr('y', barH / 2 + 1)
      .attr('dominant-baseline', 'middle')
      .attr('fill', 'rgba(255,255,255,0.5)')
      .attr('font-size', '0.72rem')
      .attr('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif')
      .text(fmt(row.value));
  });
}
