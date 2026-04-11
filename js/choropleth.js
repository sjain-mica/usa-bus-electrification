import { tooltip } from './utils.js';

/**
 * Draws a US choropleth map.
 * @param {Object} opts
 * @param {HTMLElement} opts.container  - DOM element to render into
 * @param {Object}      opts.features   - GeoJSON FeatureCollection (from topojson.feature)
 * @param {Map}         opts.dataMap    - Map<string fips, number value>
 * @param {Function}    opts.colorScale - D3 color scale
 * @param {Function}    opts.tooltipFn  - (feature) => HTML string
 * @param {string}      opts.legendLabel
 * @param {number}      opts.idPad      - zero-pad width for feature ids (2=states, 5=counties)
 */
export function drawChoropleth({ container, features, dataMap, colorScale, tooltipFn, legendLabel, idPad = 2 }) {
  const W = 900, H = 540;

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%');

  const projection = d3.geoAlbersUsa().fitSize([W, H - 50], features);
  const path = d3.geoPath().projection(projection);

  svg.selectAll('path.feature')
    .data(features.features)
    .join('path')
    .attr('class', 'feature')
    .attr('d', path)
    .attr('fill', d => {
      const key = String(d.id).padStart(idPad, '0');
      const v = dataMap.get(key);
      return v != null ? colorScale(v) : '#e5e7eb';
    })
    .attr('stroke', '#fff')
    .attr('stroke-width', idPad === 5 ? 0.3 : 0.7)
    .on('mousemove', (evt, d) => {
      const content = tooltipFn?.(d);
      if (content) tooltip.show(content, evt);
    })
    .on('mouseleave', () => tooltip.hide());

  drawLegend(svg, colorScale, W, H, legendLabel);
}

function drawLegend(svg, colorScale, W, H, label) {
  const lW = 160, lH = 10;
  const lX = W - lW - 24, lY = H - 38;

  const gradId = 'grad-' + Math.random().toString(36).slice(2, 8);
  const grad = svg.append('defs').append('linearGradient').attr('id', gradId);

  // Sample 8 stops across the domain
  const domain = colorScale.domain();
  const [dMin, dMax] = [domain[0], domain[domain.length - 1]];
  d3.range(9).forEach(i => {
    const t = i / 8;
    grad.append('stop')
      .attr('offset', t)
      .attr('stop-color', colorScale(dMin + t * (dMax - dMin)));
  });

  svg.append('rect')
    .attr('x', lX).attr('y', lY)
    .attr('width', lW).attr('height', lH)
    .attr('fill', `url(#${gradId})`)
    .attr('rx', 2);

  const lScale = d3.scaleLinear().domain([dMin, dMax]).range([lX, lX + lW]);
  svg.append('g')
    .attr('transform', `translate(0,${lY + lH})`)
    .call(d3.axisBottom(lScale).ticks(4).tickFormat(d3.format(',.0f')))
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('line').remove())
    .call(g => g.selectAll('text').attr('font-size', '9px').attr('fill', '#9ca3af'));

  if (label) {
    svg.append('text')
      .attr('x', lX).attr('y', lY - 5)
      .attr('font-size', '9px').attr('fill', '#9ca3af')
      .text(label);
  }
}
