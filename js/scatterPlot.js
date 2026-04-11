import { tooltip, fmt } from './utils.js';

/**
 * Draws a scatter plot.
 * @param {Object}   opts
 * @param {HTMLElement} opts.container
 * @param {Array}    opts.data         - [{id, x, y, county, state}]
 * @param {Set}      opts.highlightIds - ids to highlight in gold
 */
export function drawScatterPlot({ container, data, highlightIds = new Set() }) {
  const W = 520, H = 420;
  const margin = { top: 20, right: 20, bottom: 52, left: 72 };
  const iW = W - margin.left - margin.right;
  const iH = H - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.x) * 1.05]).nice()
    .range([0, iW]);

  const yScale = d3.scaleLinear()
    .domain([d3.min(data, d => d.y) * 1.05, d3.max(data, d => d.y) * 1.05]).nice()
    .range([iH, 0]);

  // Grid lines
  g.append('g').attr('class', 'grid')
    .call(d3.axisLeft(yScale).ticks(6).tickSize(-iW).tickFormat(''))
    .call(ax => ax.select('.domain').remove())
    .call(ax => ax.selectAll('line').attr('stroke', '#f3f4f6'));

  // Zero line on Y axis
  if (yScale.domain()[0] < 0) {
    g.append('line')
      .attr('x1', 0).attr('x2', iW)
      .attr('y1', yScale(0)).attr('y2', yScale(0))
      .attr('stroke', '#d1d5db').attr('stroke-width', 1).attr('stroke-dasharray', '4,3');
  }

  // Axes
  g.append('g').attr('transform', `translate(0,${iH})`)
    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format(',.0f')))
    .call(ax => ax.select('.domain').attr('stroke', '#e5e7eb'))
    .call(ax => ax.selectAll('line').attr('stroke', '#e5e7eb'))
    .call(ax => ax.selectAll('text').attr('font-size', '10px').attr('fill', '#9ca3af'));

  g.append('g')
    .call(d3.axisLeft(yScale).ticks(6).tickFormat(d3.format(',.0f')))
    .call(ax => ax.select('.domain').attr('stroke', '#e5e7eb'))
    .call(ax => ax.selectAll('line').attr('stroke', '#e5e7eb'))
    .call(ax => ax.selectAll('text').attr('font-size', '10px').attr('fill', '#9ca3af'));

  // Background dots first, then highlights on top
  const background = data.filter(d => !highlightIds.has(d.id));
  const highlight  = data.filter(d =>  highlightIds.has(d.id));

  g.selectAll('circle.bg')
    .data(background)
    .join('circle')
    .attr('class', 'bg')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 2.5)
    .attr('fill', '#bfdbfe')
    .attr('opacity', 0.6)
    .on('mousemove', (evt, d) => {
      tooltip.show(
        `<strong>${d.county}, ${d.state}</strong><br>
         Diesel: ${fmt(d.x)}<br>
         EV Benefit: ${fmt(d.y)}`,
        evt
      );
    })
    .on('mouseleave', () => tooltip.hide());

  g.selectAll('circle.hi')
    .data(highlight)
    .join('circle')
    .attr('class', 'hi')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 5)
    .attr('fill', '#f59e0b')
    .attr('stroke', '#d97706')
    .attr('stroke-width', 1)
    .on('mousemove', (evt, d) => {
      tooltip.show(
        `<strong>${d.county}, ${d.state}</strong><br>
         Diesel: ${fmt(d.x)}<br>
         EV Benefit: ${fmt(d.y)}`,
        evt
      );
    })
    .on('mouseleave', () => tooltip.hide());

  // Axis labels
  g.append('text')
    .attr('x', iW / 2).attr('y', iH + 42)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px').attr('fill', '#9ca3af')
    .text('Diesel Impact per Bus →');

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -iH / 2).attr('y', -58)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px').attr('fill', '#9ca3af')
    .text('EV Benefit per Bus →');
}
