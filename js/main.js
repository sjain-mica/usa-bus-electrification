import { initHook } from './hook.js';
import { initSection1 } from './section1.js';
import { initSection2 } from './section2.js';
import { initSection3 } from './section3.js';
import { initSection4 } from './section4.js';

const US_STATES   = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
const US_COUNTIES = 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json';

async function main() {
  const [statesGeo, countiesGeo, busData, dieselData, evData, dieselEvData, nationalCosts] = await Promise.all([
    fetch(US_STATES).then(r => r.json()),
    fetch(US_COUNTIES).then(r => r.json()),
    fetch('./buses_per_state.json').then(r => r.json()),
    fetch('./diesel_impact_per_state.json').then(r => r.json()),
    fetch('./ev_benefit_per_county.json').then(r => r.json()),
    fetch('./diesel_vs_ev_per_county.json').then(r => r.json()),
    fetch('./national_costs.json').then(r => r.json()),
  ]);

  initHook(statesGeo, busData, nationalCosts);
  initSection1(statesGeo, busData);
  initSection2(statesGeo, dieselData);
  initSection3(countiesGeo, evData);
  initSection4(dieselEvData);
}

main().catch(err => {
  console.error('Failed to load:', err);
  document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;color:red">
    <strong>Error loading data.</strong><br>
    Make sure you're running a local server:<br><br>
    <code>python3 -m http.server 8000</code><br><br>
    Then open <a href="http://localhost:8000">http://localhost:8000</a>
  </div>`;
});
