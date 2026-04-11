import { tooltip } from './utils.js';

/**
 * Draws a horizontal bar chart.
 * @param {Object}   opts
 * @param {HTMLElement} opts.container
 * @param {Array}    opts.data        - [{label, value}]
 * @param {string}   opts.color       - bar fill color
 * @param {Function} opts.tooltipFn   - (d) => HTML string
 * @param {Function} opts.valueFormat - (v) => string
 */
export function drawBarChart({ container, data, color = '#2563eb', tooltipFn, valueFormat }) {
  const margin = { top: 4, right: 64, bottom: 16, left: 130 };
  const W = 380;
  const H = data.length * 28 + margin.top + margin.bottom;
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  const vfmt = valueFormat || (v => d3.format(',.0f')(v));

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => Math.abs(d.value))])
    .range([0, iW]);

  const yScale = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([0, iH])
    .padding(0.28);

  // Bars
  g.selectAll('rect.bar')
    .data(data)
    .join('rect')
    .attr('class', 'bar')
    .attr('x', 0)
    .attr('y', d => yScale(d.label))
    .attr('width', d => xScale(Math.abs(d.value)))
    .attr('height', yScale.bandwidth())
    .attr('fill', color)
    .attr('rx', 2)
    .on('mousemove', (evt, d) => {
      if (tooltipFn) tooltip.show(tooltipFn(d), evt);
    })
    .on('mouseleave', () => tooltip.hide());

  // Value labels
  g.selectAll('text.val')
    .data(data)
    .join('text')
    .attr('class', 'val')
    .attr('x', d => xScale(Math.abs(d.value)) + 5)
    .attr('y', d => yScale(d.label) + yScale.bandwidth() / 2)
    .attr('dominant-baseline', 'middle')
    .attr('font-size', '10px')
    .attr('fill', '#9ca3af')
    .text(d => vfmt(d.value));

  // Y axis labels
  g.append('g')
    .call(d3.axisLeft(yScale).tickSize(0))
    .call(ax => ax.select('.domain').remove())
    .call(ax => ax.selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', '#374151')
      .attr('dx', '-5'));
}
