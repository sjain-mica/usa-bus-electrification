import { drawChoropleth } from './choropleth.js';
import { drawBarChart } from './barChart.js';
import { STATE_FIPS, normalizeCountyName, fmt } from './utils.js';

export function initSection3(countiesGeo, evData) {
  const countyFeatures = topojson.feature(countiesGeo, countiesGeo.objects.counties);

  // Build lookup: stateFips_normalizedName → {value, row}
  const lookup = new Map();
  evData.forEach(d => {
    const sf = STATE_FIPS[d.state];
    if (!sf) return;
    const key = sf + '_' + normalizeCountyName(d.county).toLowerCase();
    lookup.set(key, d);
  });

  // Build dataMap: county FIPS string → EV benefit value
  const dataMap = new Map();
  countyFeatures.features.forEach(f => {
    const fipsStr = String(f.id).padStart(5, '0');
    const sf = fipsStr.slice(0, 2);
    const name = (f.properties?.name || '').toLowerCase();
    const row = lookup.get(sf + '_' + name);
    if (row != null) dataMap.set(fipsStr, row.electrification_benefit_per_bus);
  });

  const values = [...dataMap.values()];
  const maxAbs = Math.max(Math.abs(d3.min(values)), d3.max(values));

  // Diverging: red (negative) → white (0) → green (positive)
  const colorScale = d3.scaleDiverging(d3.interpolateRdYlGn)
    .domain([-maxAbs, 0, maxAbs]);

  drawChoropleth({
    container: document.getElementById('map-3'),
    features: countyFeatures,
    dataMap,
    colorScale,
    legendLabel: 'EV benefit per bus ($)',
    idPad: 5,
    tooltipFn(d) {
      const fipsStr = String(d.id).padStart(5, '0');
      const sf = fipsStr.slice(0, 2);
      const name = (d.properties?.name || '').toLowerCase();
      const row = lookup.get(sf + '_' + name);
      if (!row) return null;
      return `<strong>${normalizeCountyName(row.county)}, ${row.state}</strong><br>
              EV Benefit: $${fmt(row.electrification_benefit_per_bus)}/bus`;
    }
  });

  // Top 10 positive
  const top10pos = [...evData]
    .filter(d => d.electrification_benefit_per_bus > 0)
    .sort((a, b) => b.electrification_benefit_per_bus - a.electrification_benefit_per_bus)
    .slice(0, 10)
    .map(d => ({
      label: normalizeCountyName(d.county) + ', ' + d.state,
      value: d.electrification_benefit_per_bus
    }));

  drawBarChart({
    container: document.getElementById('chart-ev-top'),
    data: top10pos,
    color: '#16a34a',
    tooltipFn: d => `<strong>${d.label}</strong><br>Benefit: $${fmt(d.value)}/bus`,
    valueFormat: v => '$' + d3.format(',.0f')(v)
  });

  // Top 10 negative (sorted most negative first)
  const top10neg = [...evData]
    .filter(d => d.electrification_benefit_per_bus < 0)
    .sort((a, b) => a.electrification_benefit_per_bus - b.electrification_benefit_per_bus)
    .slice(0, 10)
    .map(d => ({
      label: normalizeCountyName(d.county) + ', ' + d.state,
      value: Math.abs(d.electrification_benefit_per_bus)
    }));

  drawBarChart({
    container: document.getElementById('chart-ev-neg'),
    data: top10neg,
    color: '#dc2626',
    tooltipFn: d => `<strong>${d.label}</strong><br>EV would cost $${fmt(d.value)} more/bus`,
    valueFormat: v => '-$' + d3.format(',.0f')(v)
  });
}
