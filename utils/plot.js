import { forceSimulation, forceManyBody, forceX, forceY, forceCollide } from 'd3-force';
import { transition } from 'd3-transition';
import { select } from 'd3-selection';

export const plotsampleCoords = (samples, sampleCoords, svg, excludeRectRange = null) => {
    
    // Create a force simulation to prevent overlapping samples
    const simulation = forceSimulation(sampleCoords)
        .force("charge", forceManyBody().strength(-10))
        .force("x", forceX(d => d.x).strength(0.5))
        .force("y", forceY(d => d.y).strength(0.5))
        .force("collide", forceCollide().radius(20).strength(0.5))
        .stop();

    // Manually run the simulation for a set number of ticks
    for (let i = 0; i < 10; i++) simulation.tick();

    // Transition duration in milliseconds
    const duration = 750;

    // Update pattern: Bind data to groups, handling entering (new) and updating (existing) elements
    let samplesGroup = svg.selectAll('g')
        .data(sampleCoords, (_, i) => i); // Assuming each data point has an identifier 'id'

    // Enter new elements
    const enterGroup = samplesGroup.enter()
        .append('g')
        .attr('transform', d => `translate(${d.left},${d.top})`); // Initial position

    // Append rects conditionally
    enterGroup.filter((_, i) => !excludeRectRange || (i < excludeRectRange.start || i > excludeRectRange.end))
        .append('rect')
        .attr('class', 'rect-included') // Add class for styling
        .attr('width', 100)
        .attr('height', 40)
        .attr('rx', 20)
        .attr('ry', 20);

    const padding = 10;

    // Append text elements
    enterGroup.append('text')
        .attr('x', padding)
        .attr('y', 20)
        .attr('dominant-baseline', 'middle')
        .attr('class', (_, i) => excludeRectRange && (i >= excludeRectRange.start && i <= excludeRectRange.end) ? 'text-excluded' : 'text-included') // Apply class based on condition
        .text((_, i) => samples[i]);

    // Merge entering elements with updating ones to apply transitions
    samplesGroup = enterGroup.merge(samplesGroup);

    // Apply transitions to all groups (both new and updating)
    samplesGroup.transition().duration(duration)
        .attr('transform', d => `translate(${d.left},${d.top})`);

    samplesGroup.select('text')
        .each(function(d, i) {
            if (!excludeRectRange || (i < excludeRectRange.start || i > excludeRectRange.end)) {
                const textWidth = this.getComputedTextLength();
                const rectWidth = textWidth + 2 * padding;
                select(this.previousSibling) // Assuming the rectangle is immediately before the text in the DOM
                    .transition().duration(duration)
                    .attr('width', rectWidth);
            }
        });
};
