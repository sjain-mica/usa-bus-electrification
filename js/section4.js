import { drawScatterPlot } from './scatterPlot.js';
import { drawBarChart } from './barChart.js';
import { normalizeCountyName, fmt } from './utils.js';

export function initSection4(dieselEvData) {
  // opportunity = how much better EV is vs diesel (higher = better candidate)
  const enriched = dieselEvData.map(d => ({
    ...d,
    countyClean: normalizeCountyName(d.county),
    opportunity: d.diesel_combined_impact_per_bus - d.ev_combined_impact_per_bus
  }));

  const top10 = [...enriched]
    .sort((a, b) => b.opportunity - a.opportunity)
    .slice(0, 10);

  const highlightIds = new Set(top10.map(d => d.county + '_' + d.state));

  // Scatter: X = diesel impact, Y = EV opportunity (benefit)
  const scatterData = enriched.map(d => ({
    id: d.county + '_' + d.state,
    x: d.diesel_combined_impact_per_bus,
    y: d.opportunity,
    county: d.countyClean,
    state: d.state
  }));

  drawScatterPlot({
    container: document.getElementById('scatter'),
    data: scatterData,
    highlightIds
  });

  // Priority bar chart — top 10
  const barData = top10.map(d => ({
    label: d.countyClean + ', ' + d.state,
    value: d.opportunity
  }));

  drawBarChart({
    container: document.getElementById('chart-priority'),
    data: barData,
    color: '#f59e0b',
    tooltipFn: d => `<strong>${d.label}</strong><br>Opportunity: $${fmt(d.value)}/bus`,
    valueFormat: v => '$' + d3.format(',.0f')(v)
  });
}
