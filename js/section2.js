import { drawChoropleth } from './choropleth.js';
import { drawBarChart } from './barChart.js';
import { STATE_FIPS, STATE_NAMES, fmt } from './utils.js';

export function initSection2(statesGeo, dieselData) {
  const fipsToAbbrev = Object.fromEntries(Object.entries(STATE_FIPS).map(([a, f]) => [f, a]));

  // Map: state FIPS → combined diesel impact
  const dataMap = new Map(
    dieselData.map(d => [STATE_FIPS[d.state], d.diesel_combined_impact_per_bus])
  );

  const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([0, d3.max(dieselData, d => d.diesel_combined_impact_per_bus)]);

  // Quick lookup by state abbrev for tooltip
  const byState = new Map(dieselData.map(d => [d.state, d]));

  drawChoropleth({
    container: document.getElementById('map-2'),
    features: topojson.feature(statesGeo, statesGeo.objects.states),
    dataMap,
    colorScale,
    legendLabel: 'Diesel impact per bus ($)',
    idPad: 2,
    tooltipFn(d) {
      const abbrev = fipsToAbbrev[String(d.id).padStart(2, '0')];
      if (!abbrev) return null;
      const row = byState.get(abbrev);
      if (!row) return `<strong>${STATE_NAMES[abbrev]}</strong><br>No data`;
      return `<strong>${STATE_NAMES[abbrev]}</strong><br>
              Combined: $${fmt(row.diesel_combined_impact_per_bus)}<br>
              Climate: $${fmt(row.diesel_climate_impact_per_bus)}<br>
              Health: $${fmt(row.diesel_health_impact_per_bus)}`;
    }
  });

  // Climate bar chart — top 10
  const climateTop10 = [...dieselData]
    .sort((a, b) => b.diesel_climate_impact_per_bus - a.diesel_climate_impact_per_bus)
    .slice(0, 10)
    .map(d => ({ label: d.state, value: d.diesel_climate_impact_per_bus }));

  drawBarChart({
    container: document.getElementById('chart-climate'),
    data: climateTop10,
    color: '#f97316',
    tooltipFn: d => `<strong>${STATE_NAMES[d.label] || d.label}</strong><br>Climate: $${fmt(d.value)}/bus`,
    valueFormat: v => '$' + d3.format(',.0f')(v)
  });

  // Health bar chart — top 10
  const healthTop10 = [...dieselData]
    .sort((a, b) => b.diesel_health_impact_per_bus - a.diesel_health_impact_per_bus)
    .slice(0, 10)
    .map(d => ({ label: d.state, value: d.diesel_health_impact_per_bus }));

  drawBarChart({
    container: document.getElementById('chart-health'),
    data: healthTop10,
    color: '#ef4444',
    tooltipFn: d => `<strong>${STATE_NAMES[d.label] || d.label}</strong><br>Health: $${fmt(d.value)}/bus`,
    valueFormat: v => '$' + d3.format(',.0f')(v)
  });
}
