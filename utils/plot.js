import { forceSimulation, forceManyBody, forceX, forceY, forceCollide } from 'd3-force';
import { transition } from 'd3-transition';
import { select } from 'd3-selection';

export const plotCoords = (svg, combinedData) => {
    
    combinedData.forEach(item => {
        item.x = item.left; // Initialize x with left
        item.y = item.top;  // Initialize y with top
    });
    
    const simulation = forceSimulation(combinedData)
        .force("charge", forceManyBody().strength(-10))
        .force("x", forceX(d => d.x).strength(0.5))
        .force("y", forceY(d => d.y).strength(0.5))
        .force("collide", forceCollide().radius(20).strength(0.5))
        .stop();
    
    // Run the simulation
    for (let i = 0; i < 120; i++) simulation.tick();

    const duration = 750; // Transition duration in milliseconds

    let samplesGroup = svg.selectAll('g')
        .data(combinedData, (_, i) => i);

    // Handle entering elements
    const enterGroup = samplesGroup.enter()
        .append('g')
        .attr('transform', d => `translate(${d.x},${d.y})`);
    
    enterGroup.filter(d => d.lvl === 'm')
        .append('rect')
        .attr('class', 'rect-included')
        .attr('width', 100)
        .attr('height', 40)
        .attr('rx', 20)
        .attr('ry', 20);

    const padding = 10;

    enterGroup.append('text')
        .attr('x', padding)
        .attr('y', 20)
        .attr('dominant-baseline', 'middle')
        .text(d => d.smp);

    samplesGroup.exit()
        .transition().duration(duration)
        .style('opacity', 0) // Transition the opacity to 0 before removing
        .remove();

    // Handle updating elements
    samplesGroup = enterGroup.merge(samplesGroup)
        .transition().duration(duration)
        .attr('transform', d => `translate(${d.x},${d.y})`);
    
    samplesGroup.select('text')
        .each(function(d) {
            if (d.lvl === 'm') {
                const textWidth = this.getComputedTextLength();
                const rectWidth = textWidth + 2 * padding;
                select(this.previousSibling)
                    .transition().duration(duration)
                    .attr('width', rectWidth);
            }
        });
};
