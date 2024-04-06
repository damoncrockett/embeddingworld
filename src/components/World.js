import React, { useRef, useEffect } from 'react';
import { transition } from 'd3-transition';
import { select } from 'd3-selection';
import { zoom, zoomTransform, zoomIdentity } from 'd3-zoom';
import { scaleLinear } from 'd3-scale';
import { min, max } from 'd3-array';
import { calculateLineEndpoints } from '../../utils/geometry';

const svgHeight = window.innerHeight;
const svgWidth = window.innerWidth;

const padding = { top: 200, right: 160, bottom: 40, left: 40 };
const rectStrokeWidth = 2;
const rectXAdjustment = 5;
const rectYAdjustment = 20;

let xDomain, yDomain, xScale, yScale, mapTexts, mapPointsContainer, xScaleZoomed, yScaleZoomed;

const transitionDuration = 750;

export default function World({ 
    mapData,
    selectionsData,
    graphData, 
    setClickChange, 
    isSpreadMeterHovered,
    isOutlierMeterHovered, 
    maxPair,
    maxZscoreSample, 
    selectMode, 
    selections, 
    setSelections,
    reducer
}) {
    
    const svgRef = useRef(null);
    const zoomRef = useRef();
    
    const clickTimer = useRef(null);
    const handleClickRef = useRef();
    const handleDoubleClickRef = useRef();

    useEffect(() => {

        const handleClick = (event, d) => {
            if (clickTimer.current === null) {
                clickTimer.current = setTimeout(() => {
                    if (selectMode) {
                        if (!selections.includes(d.smp)) {
                            let newSelections;
                            const nullIndex = selections.indexOf(null);
                            if (reducer === 'nearest') { // new selection pushes others down and first null (if any) gets filled
                                if (nullIndex !== -1) {
                                    newSelections = [d.smp, ...selections.slice(0, nullIndex), ...selections.slice(nullIndex + 1)];
                                } else {
                                    newSelections = [d.smp, ...selections.slice(0, selections.length - 1)];
                                }
                            } else { // new selection fills first null or replaces last selection
                                if (nullIndex !== -1) {
                                    newSelections = [...selections.slice(0, nullIndex), d.smp, ...selections.slice(nullIndex + 1)];
                                } else {
                                    newSelections = [...selections.slice(0, selections.length - 1), d.smp];
                                }
                            }    
                            setSelections(newSelections);
                        }
                    } else {
                        setClickChange({changeType: 'switch', smp: d.smp});
                    }
                    clearTimeout(clickTimer.current);
                    clickTimer.current = null;
                }, 250);
            } else {
                clearTimeout(clickTimer.current);
                clickTimer.current = null;
            }
        };
                        
        handleClickRef.current = handleClick;
    
        const handleDoubleClick = (event, d) => {
            // prevent zoom on double click
            event.preventDefault();
            event.stopPropagation();
    
            clearTimeout(clickTimer.current);
            clickTimer.current = null;
    
            if (!selectMode) {
                setClickChange({changeType: 'remove', smp: d.smp});
            }
        };
    
        handleDoubleClickRef.current = handleDoubleClick;
    
        return () => {
            clearTimeout(clickTimer.current); 
            clickTimer.current = null;
        };
    }, [selectMode, selections, reducer]);

    const handleZoom = (event) => {
        const { transform } = event;
        
        xScaleZoomed = transform.rescaleX(xScale);
        yScaleZoomed = transform.rescaleY(yScale);
        
        select(svgRef.current).selectAll('text.map')
            .attr('x', d => xScaleZoomed(d.x))
            .attr('y', d => yScaleZoomed(d.y));

        select(svgRef.current).selectAll('line.connectionLine')
            .attr('x1', d => xScaleZoomed(d.source.x))
            .attr('y1', d => yScaleZoomed(d.source.y))
            .attr('x2', d => xScaleZoomed(d.target.x))
            .attr('y2', d => yScaleZoomed(d.target.y));

        select(svgRef.current).selectAll('rect.selectedRect')
            .attr('x', d => xScaleZoomed(d.x) - rectXAdjustment)
            .attr('y', d => yScaleZoomed(d.y) - rectYAdjustment);

        select(svgRef.current).selectAll('text.selectedText')
            .attr('x', d => xScaleZoomed(d.x))
            .attr('y', d => yScaleZoomed(d.y));

    }
    
    const resetZoom = () => {
        select(svgRef.current).transition().duration(transitionDuration).call(zoomRef.current.transform, zoomIdentity);
    };

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

        zoomRef.current = initialZoom
    
        svg.call(initialZoom)
           .on('dblclick.zoom', null); 

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

        xScaleZoomed = zoomTransform(svgRef.current).rescaleX(xScale);
        yScaleZoomed = zoomTransform(svgRef.current).rescaleY(yScale);

        // map points
        mapTexts = mapPointsContainer.selectAll('text.map')
            .data(mapData, d => d.smp + "-" + d.lvl)
            .join(
                enter => enter.append('text')
                            .attr('class', d => d.lvl === 'm' ? 'map textMap' : 'map textBasemap')
                            .attr('x', d => xScaleZoomed(d.x))
                            .attr('y', d => yScaleZoomed(d.y))
                            .text(d => d.smp)
                            .attr('data-smp', d => d.smp) // use for rect sizing
                            .attr('fill', 'coral')
                            .on('click', (event, d) => handleClickRef.current(event, d))
                            .on('dblclick', (event, d) => handleDoubleClickRef.current(event, d))
                            .call(enter => enter.transition().duration(transitionDuration * 2)
                                .attr('fill', d => d.lvl === 'm' ? 'white' : 'grey')),
                update => update.transition().duration(transitionDuration)
                            .attr('x', d => xScaleZoomed(d.x))
                            .attr('y', d => yScaleZoomed(d.y)),
                exit => exit.transition().duration(transitionDuration)
                            .style('opacity', 0)
                            .remove()
            );

        mapTexts.on('click', (event, d) => handleClickRef.current(event, d))
                .on('dblclick', (event, d) => handleDoubleClickRef.current(event, d));


        return () => {
            mapPointsContainer.selectAll('text.map').on('click', null).on('dblclick', null);
        };

    }, [mapData, selectMode, selections]);

    useEffect(() => {

        if (mapData) {
            xScaleZoomed = zoomTransform(svgRef.current).rescaleX(xScale);
            yScaleZoomed = zoomTransform(svgRef.current).rescaleY(yScale);
        }

        // path lines
        mapPointsContainer.selectAll('line.connectionLine')
            .data(graphData.lines, d => `${d.source.smp}-${d.target.smp}`)
            .join(
                enter => {
                    const initialEnter = enter.append('line')
                                            .attr('class', 'connectionLine')
                                            .attr('stroke', 'white')
                                            .attr('x1', d => xScaleZoomed(d.source.x))
                                            .attr('y1', d => yScaleZoomed(d.source.y))
                                            .attr('x2', d => xScaleZoomed(d.target.x))
                                            .attr('y2', d => yScaleZoomed(d.target.y))
                                            .attr('stroke-width', d => d.weight)
                                            .attr('stroke-opacity', 0); 

                    initialEnter.transition()
                                .delay(transitionDuration)
                                .duration(transitionDuration)
                                .attr('stroke-opacity', 0.5); 

                    initialEnter.transition()
                                .delay(transitionDuration * 2) 
                                .duration(transitionDuration)
                                .attr('stroke', d => graphData.path.includes(`${d.source.smp}-${d.target.smp}`) ? 'coral' : 'black'); 
                },
                update => update.transition().duration(transitionDuration)
                                    .attr('x1', d => xScaleZoomed(d.source.x))
                                    .attr('y1', d => yScaleZoomed(d.source.y))
                                    .attr('x2', d => xScaleZoomed(d.target.x))
                                    .attr('y2', d => yScaleZoomed(d.target.y))
                                    .attr('stroke-width', d => d.weight)
                                    .attr('stroke', d => graphData.path.includes(`${d.source.smp}-${d.target.smp}`) ? 'coral' : 'black'),
                exit => exit.transition().duration(transitionDuration)
                                    .attr('stroke-opacity', 0) // Fade out before removing
                                    .remove()
            );
    }, [graphData]);

    useEffect(() => {

        if (!selectionsData) return;

        if (mapData) {
            xScaleZoomed = zoomTransform(svgRef.current).rescaleX(xScale);
            yScaleZoomed = zoomTransform(svgRef.current).rescaleY(yScale);
        }

        const selectedTextSize = selectionsData.map(d => {
            const textElement = mapPointsContainer.select(`text[data-smp="${d.smp}"]`).node();
            if (!textElement) return null;
            const bbox = textElement.getBBox();
            return { smp: d.smp, width: bbox.width, height: bbox.height };
        }).filter(Boolean); 
        
        mapPointsContainer.selectAll('rect.selectedRect')
            .data(selectionsData, d => d.smp + "-" + d.lvl)
            .join(
                enter => {
                    enter.append('rect')
                            .attr('class', 'selectedRect')
                            .attr('x', (d,i) => xScaleZoomed(d.x) - rectXAdjustment)
                            .attr('y', (d,i) => yScaleZoomed(d.y) - rectYAdjustment)
                            .attr('width', (d,i) => selectedTextSize[i].width + 10)
                            .attr('height', (d,i) => selectedTextSize[i].height + 10)
                            .attr('rx', 5)
                            .attr('fill', 'white')
                            .attr('stroke', 'coral')
                            .attr('stroke-width', rectStrokeWidth)
                            .style('opacity', 0)
                            .call(enter => enter.transition().duration(transitionDuration).style('opacity', 1))},
                update => {
                    update.transition().duration(transitionDuration)
                            .attr('x', (d,i) => xScaleZoomed(d.x) - rectXAdjustment)
                            .attr('y', (d,i) => yScaleZoomed(d.y) - rectYAdjustment)},
                exit => {
                    exit.transition().duration(transitionDuration).style('opacity', 0).remove()}
            );

        mapPointsContainer.selectAll('text.selectedText')
            .data(selectionsData, d => d.smp + "-" + d.lvl)
            .join(
                enter => enter.append('text')
                            .attr('x', d => xScaleZoomed(d.x))
                            .attr('y', d => yScaleZoomed(d.y))
                            .attr('class', 'selectedText')
                            .style('fill', 'black')
                            .text(d => d.smp)
                            .style('opacity', 0)
                            .call(enter => enter.transition().duration(transitionDuration).style('opacity', 1)),
                update => update.transition().duration(transitionDuration)
                            .attr('x', d => xScaleZoomed(d.x))
                            .attr('y', d => yScaleZoomed(d.y)),
                exit => exit.transition().duration(transitionDuration).style('opacity', 0).remove()
            );
    }, [selectionsData]);

    useEffect(() => {

        // highlight max pair
        if (isSpreadMeterHovered && maxPair && maxPair.length === 2) {
            
            setTimeout(() => { // to ensure text elements are already drawn
                const spreadRectData = maxPair.map(smp => {
                    const textElement = mapPointsContainer.select(`text[data-smp="${smp}"]`).node();
                    if (!textElement) return null;
                    const bbox = textElement.getBBox();
                    return { smp, bbox };
                }).filter(Boolean); // remove null values
    
                spreadRectData.forEach(({ smp, bbox }) => {
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
    
                if (spreadRectData.length === 2) {
                    const { lineStart, lineEnd } = calculateLineEndpoints(spreadRectData[0].bbox, spreadRectData[1].bbox, rectStrokeWidth);

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
                            .attr('x', bbox.x + bbox.width / 2) 
                            .attr('y', bbox.y + bbox.height / 2)
                            .attr('class', 'highlighted-text') 
                            .style('fill', 'black') 
                            .attr('text-anchor', 'middle') 
                            .attr('dy', "0.35em") 
                            .text(originalTextElement.text())
                            .attr('data-smp', smp) 
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
    }, [isSpreadMeterHovered, maxPair]);

    useEffect(() => {

        // highlight max z-score sample
        if (isOutlierMeterHovered && maxZscoreSample) {
            
            // exactly as above, but for a single item only, and thus no line is drawn
            setTimeout(() => {
                const textElement = mapPointsContainer.select(`text[data-smp="${maxZscoreSample}"]`).node();
                if (textElement) {
                    const bbox = textElement.getBBox();
                    mapPointsContainer.append('rect')
                        .attr('class', 'maxZscoreRect')
                        .attr('x', bbox.x - 5)
                        .attr('y', bbox.y - 5)
                        .attr('width', bbox.width + 10)
                        .attr('height', bbox.height + 10)
                        .attr('rx', 5)
                        .attr('fill', 'white')
                        .attr('stroke', 'coral')
                        .attr('stroke-width', rectStrokeWidth)
                        .attr('data-smp', maxZscoreSample)
                        .style('opacity', 0)
                        .transition().duration(transitionDuration).style('opacity', 1);

                    const originalTextElement = mapPointsContainer.select(`text[data-smp="${maxZscoreSample}"]`);
                    if (!originalTextElement.empty()) {
                        const bbox = originalTextElement.node().getBBox();
                        mapPointsContainer.append('text')
                            .attr('x', bbox.x + bbox.width / 2) 
                            .attr('y', bbox.y + bbox.height / 2)
                            .attr('class', 'highlighted-text') 
                            .style('fill', 'black') 
                            .attr('text-anchor', 'middle') 
                            .attr('dy', "0.35em") 
                            .text(originalTextElement.text())
                            .attr('data-smp', maxZscoreSample) 
                            .style('opacity', 0)
                            .transition().duration(transitionDuration).style('opacity', 1);
                    }
                }
            }, 0);
        } else {
            mapPointsContainer.selectAll('.maxZscoreRect').transition().duration(transitionDuration).style('opacity', 0).remove();
            mapPointsContainer.selectAll('.highlighted-text[data-smp]').transition().duration(transitionDuration).style('opacity', 0).remove();
        }
    }, [isOutlierMeterHovered, maxZscoreSample]);

    return (
        <>
            <button id='reset-zoom' className='material-icons' onClick={resetZoom}>flip_camera_ios</button>
            <svg
                id="svg-canvas"
                ref={svgRef} 
                width={svgWidth} 
                height={svgHeight}
            >
            </svg>
        </>
    );
};


