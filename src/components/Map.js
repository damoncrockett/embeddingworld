import React, { useRef, useEffect } from 'react';
import { transition } from 'd3-transition';
import { select } from 'd3-selection';
import { zoom, zoomTransform } from 'd3-zoom';
import { scaleLinear } from 'd3-scale';
import { min, max } from 'd3-array';
import { calculateLineEndpoints } from '../../utils/geometry';

const svgHeight = window.innerHeight;
const svgWidth = window.innerWidth;

const padding = { top: 80, right: 80, bottom: 80, left: 80 };

let xDomain, yDomain, xScale, yScale, mapTexts, mapPointsContainer;

const transitionDuration = 750;

export default function Map({ mapData, setClickChange, isMeterHovered, maxPair}) {
    
    const svgRef = useRef(null);
    
    let clickTimer = null;

    const handleClick = (event, d) => {
        if (clickTimer === null) {
            clickTimer = setTimeout(() => {
                
                setClickChange({changeType: 'switch', smp: d.smp})
                
                clickTimer = null;
            }, 250);
        }
    };

    const handleDoubleClick = (event, d) => {
        // prevent zoom on double click
        event.preventDefault();
        event.stopPropagation();

        clearTimeout(clickTimer); // Cancel the pending single click action
        clickTimer = null;
    
        // Set a timeout to delay the action after double click
        setTimeout(() => {
            setClickChange({changeType: 'remove', smp: d.smp})
        }, 250); // Adjust the delay as needed
    };

    const handleZoom = (event) => {
        const { transform } = event;
        
        const xScaleZoomed = transform.rescaleX(xScale);
        const yScaleZoomed = transform.rescaleY(yScale);
        
        select(svgRef.current).selectAll('text.map')
            .attr('x', d => xScaleZoomed(d.x))
            .attr('y', d => yScaleZoomed(d.y));

    }

    useEffect(() => {
        const svg = select(svgRef.current);
        
        mapPointsContainer = svg.select('.mapPointsContainer');
        if (mapPointsContainer.empty()) {
            mapPointsContainer = svg.append('g').attr('class', 'mapPointsContainer');
        }
    
        const initialZoom = zoom()
            .extent([[0, 0], [svgWidth, svgHeight]])
            .scaleExtent([0.25, 5])
            .on('zoom', handleZoom);
    
        svg.call(initialZoom)
           .on('dblclick.zoom', null); // Disable double-click zoom

    }, []);
    
    useEffect(() => {

        if (!mapData) return;

        xDomain = [min(mapData, d => d.x), max(mapData, d => d.x)];
        yDomain = [min(mapData, d => d.y), max(mapData, d => d.y)];

        xScale = scaleLinear()
            .domain(xDomain)
            .range([padding.left, svgWidth - padding.right]);

        yScale = scaleLinear()
            .domain(yDomain)
            .range([svgHeight - padding.bottom, padding.top]);

        const xScaleZoomed = zoomTransform(svgRef.current).rescaleX(xScale);
        const yScaleZoomed = zoomTransform(svgRef.current).rescaleY(yScale);

        // Text elements drawing
        mapTexts = mapPointsContainer.selectAll('text.map')
            .data(mapData, d => d.smp + "-" + d.lvl)
            .join(
                enter => enter.append('text')
                            .attr('class', d => d.lvl === 'm' ? 'map textMap' : 'map textBasemap')
                            .attr('x', d => xScaleZoomed(d.x))
                            .attr('y', d => yScaleZoomed(d.y))
                            .text(d => d.smp)
                            .attr('data-smp', d => d.smp) // use for rect sizing
                            .on('click', handleClick)
                            .on('dblclick', handleDoubleClick),
                update => update.transition().duration(transitionDuration)
                                .attr('x', d => xScaleZoomed(d.x))
                                .attr('y', d => yScaleZoomed(d.y)),
                exit => exit.transition().duration(transitionDuration)
                            .style('opacity', 0)
                            .remove()
            );


        if (isMeterHovered && maxPair && maxPair.length === 2) {
            
            setTimeout(() => { // to ensure text elements are already drawn
                const rectData = maxPair.map(smp => {
                    const textElement = mapPointsContainer.select(`text[data-smp="${smp}"]`).node();
                    if (!textElement) return null;
                    const bbox = textElement.getBBox();
                    return { smp, bbox };
                }).filter(Boolean); // remove null values

                const rectStrokeWidth = 2;
    
                // Draw rectangles based on measured text sizes
                rectData.forEach(({ smp, bbox }) => {
                    mapPointsContainer.append('rect')
                        .attr('class', 'maxPairRect')
                        .attr('x', bbox.x - 5)
                        .attr('y', bbox.y - 5)
                        .attr('width', bbox.width + 10)
                        .attr('height', bbox.height + 10)
                        .attr('rx', 5)
                        .attr('fill', 'white')
                        .attr('stroke', 'coral')
                        .attr('stroke-width', rectStrokeWidth)
                        .attr('data-smp', smp)
                        .style('opacity', 0)
                        .transition().duration(transitionDuration).style('opacity', 1);
                });
    
                if (rectData.length === 2) {
                    const { lineStart, lineEnd } = calculateLineEndpoints(rectData[0].bbox, rectData[1].bbox, rectStrokeWidth);

                    mapPointsContainer.append('line')
                        .attr('class', 'maxPairLine')
                        .attr('x1', lineStart.x)
                        .attr('y1', lineStart.y)
                        .attr('x2', lineEnd.x)
                        .attr('y2', lineEnd.y)
                        .attr('stroke', 'coral')
                        .attr('stroke-width', 2)
                        .attr('stroke-dasharray', '5,5')
                        .style('opacity', 0)
                        .transition().duration(transitionDuration).style('opacity', 1);
                }

                maxPair.forEach(smp => {
                    const originalTextElement = mapPointsContainer.select(`text[data-smp="${smp}"]`);
                    if (!originalTextElement.empty()) {
                        const bbox = originalTextElement.node().getBBox();
                        mapPointsContainer.append('text')
                            .attr('x', bbox.x + bbox.width / 2) // Centering text in the rectangle
                            .attr('y', bbox.y + bbox.height / 2)
                            .attr('class', 'highlighted-text') // Use this class for specific styling
                            .style('fill', 'black') // Specify the color directly or in CSS
                            .attr('text-anchor', 'middle') // Center align text
                            .attr('dy', "0.35em") // Vertically center align text
                            .text(originalTextElement.text())
                            .attr('data-smp', smp) // Tagging for easy removal
                            .style('opacity', 0)
                            .transition().duration(transitionDuration).style('opacity', 1);
                    }
                });
                

            }, 0); // timeout is 0 but this will still put the code at the end of the event loop
        } else {
            mapPointsContainer.selectAll('.maxPairRect').transition().duration(transitionDuration).style('opacity', 0).remove();
            mapPointsContainer.selectAll('.maxPairLine').transition().duration(transitionDuration).style('opacity', 0).remove();
            mapPointsContainer.selectAll('.highlighted-text[data-smp]').transition().duration(transitionDuration).style('opacity', 0).remove();
        }
        
    }, [mapData, isMeterHovered, maxPair]);

    return (
        <svg
            id="svg-canvas"
            ref={svgRef} 
            width={svgWidth} 
            height={svgHeight}
        >
        </svg>
    );
};


