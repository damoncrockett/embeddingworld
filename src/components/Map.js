import React, { useRef, useEffect } from 'react';
import { transition } from 'd3-transition';
import { select } from 'd3-selection';
import { zoom, zoomTransform } from 'd3-zoom';
import { scaleLinear } from 'd3-scale';
import { min, max } from 'd3-array';

const svgHeight = window.innerHeight * 0.8;
const svgWidth = window.innerWidth * 0.8;

let xDomain, yDomain, xScale, yScale, mapTexts, mapPointsContainer;

export default function Map({ mapData }) {
    
    const svgRef = useRef(null);

    const handleZoom = (event) => {
        const { transform } = event;
        
        const xScaleZoomed = transform.rescaleX(xScale);
        const yScaleZoomed = transform.rescaleY(yScale);
        
        select(svgRef.current).selectAll('text')
            .attr('x', d => xScaleZoomed(d.x))
            .attr('y', d => yScaleZoomed(d.y));

    }

    useEffect(() => {
        const svg = select(svgRef.current);
        
        mapPointsContainer = svg.select('.mapPointsContainer');
        if (mapPointsContainer.empty()) {
            mapPointsContainer = svg.append('g').attr('class', 'mapPointsContainer');
        }

        svg.call(zoom()
            .extent([[0, 0], [svgWidth, svgHeight]])
            .scaleExtent([0.25, 5])
            .on('zoom', handleZoom));

    }, []);

    useEffect(() => {

        if (!mapData) return;

        xDomain = [min(mapData, d => d.x), max(mapData, d => d.x)];
        yDomain = [min(mapData, d => d.y), max(mapData, d => d.y)];

        xScale = scaleLinear().domain(xDomain).range([0, svgWidth]);
        yScale = scaleLinear().domain(yDomain).range([0, svgHeight]);

        const xScaleZoomed = zoomTransform(svgRef.current).rescaleX(xScale);
        const yScaleZoomed = zoomTransform(svgRef.current).rescaleY(yScale);

        // key in callback can be any unique identifier; important for exit selection
        mapTexts = mapPointsContainer.selectAll('text')
            .data(mapData, d => d.smp);

        const enterText = mapTexts.enter().append('text')
            .attr('class', d => d.lvl === 'm' ? 'textMap' : 'textBasemap')
            .attr('x', d => xScaleZoomed(d.x))
            .attr('y', d => yScaleZoomed(d.y))
            .text(d => d.smp);

        const duration = 750; 

        mapTexts.exit()
            .transition().duration(duration)
            .style('opacity', 0)
            .remove();

        mapTexts = enterText.merge(mapTexts);

        mapTexts.transition().duration(duration)
            .attr('x', d => xScaleZoomed(d.x))
            .attr('y', d => yScaleZoomed(d.y));
        
    }, [mapData]);

    return (
        <svg 
            ref={svgRef} 
            style={{ flexGrow: 1, border: "1px solid black", position: "fixed", top: "10%", left: "10%"}} 
            width={svgWidth} 
            height={svgHeight}
        >
        </svg>
    );
};
