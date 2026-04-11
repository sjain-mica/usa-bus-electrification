import { drawChoropleth } from './choropleth.js';
import { STATE_FIPS, STATE_NAMES, fmt } from './utils.js';

export function initSection1(statesGeo, busData) {
  const totalBuses = d3.sum(busData, d => d.buses);

  const stats = [
    { value: fmt(totalBuses), label: 'Diesel School Buses' },
    { value: '495M',          label: 'Miles Driven Annually' },
    { value: '$179M',         label: 'Annual Fuel Costs' },
  ];

  const heroEl = document.getElementById('hero-stats');
  stats.forEach(s => {
    const div = document.createElement('div');
    div.className = 'stat';
    div.innerHTML = `<span class="stat-value">${s.value}</span><span class="stat-label">${s.label}</span>`;
    heroEl.appendChild(div);
  });

  // Build dataMap: state FIPS string → bus count
  const dataMap = new Map(
    busData.map(d => [STATE_FIPS[d.state], d.buses])
  );

  const colorScale = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, d3.max(busData, d => d.buses)]);

  // Reverse lookup: FIPS → abbrev
  const fipsToAbbrev = Object.fromEntries(Object.entries(STATE_FIPS).map(([a, f]) => [f, a]));

  drawChoropleth({
    container: document.getElementById('map-1'),
    features: topojson.feature(statesGeo, statesGeo.objects.states),
    dataMap,
    colorScale,
    legendLabel: 'Buses per state',
    idPad: 2,
    tooltipFn(d) {
      const abbrev = fipsToAbbrev[String(d.id).padStart(2, '0')];
      if (!abbrev) return null;
      const v = dataMap.get(STATE_FIPS[abbrev]);
      return `<strong>${STATE_NAMES[abbrev]}</strong><br>${v != null ? fmt(v) + ' buses' : 'No data'}`;
    }
  });
}
