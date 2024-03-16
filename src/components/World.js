import React, { useRef, useEffect } from 'react';
import { transition } from 'd3-transition';
import { select } from 'd3-selection';
import { zoom, zoomTransform, zoomIdentity } from 'd3-zoom';
import { scaleLinear } from 'd3-scale';
import { min, max } from 'd3-array';
import { calculateLineEndpoints } from '../../utils/geometry';
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';
import { drag } from 'd3-drag';


const svgHeight = window.innerHeight;
const svgWidth = window.innerWidth;

const padding = { top: 200, right: 160, bottom: 40, left: 40 };

let xDomain, yDomain, xScale, yScale, mapTexts, mapPointsContainer;

const transitionDuration = 750;

export default function World({ 
    mapData, 
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

    
    const handleZoomRef = useRef();

    useEffect(() => {

        const handleZoom = (event) => {
            const { transform } = event;
        
            if (reducer === 'paths') {
                mapPointsContainer.attr('transform', transform);
            } else {
                const xScaleZoomed = transform.rescaleX(xScale);
                const yScaleZoomed = transform.rescaleY(yScale);
        
                select(svgRef.current).selectAll('text.map')
                    .attr('x', d => xScaleZoomed(d.x))
                    .attr('y', d => yScaleZoomed(d.y));
            }
        };

        handleZoomRef.current = handleZoom;

    }, [reducer]);
    
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
            .on('zoom', handleZoomRef.current);

        zoomRef.current = initialZoom
    
        svg.call(initialZoom)
           .on('dblclick.zoom', null); 

    }, [reducer]);
    
    useEffect(() => {

        if (!mapData) return;

        if (reducer === 'paths') {

            const nodes = Array.from(mapData.entries()).map(([key, value]) => ({
                id: key, // or you might want to use 'smp' value from your object depending on how you want to identify nodes
                smp: value.smp
            }));
            
            const links = [];
            
            mapData.forEach((value, key) => {
                value.connections.forEach(conn => {
                links.push({
                    source: key, // or the 'smp' of the source node, if using 'smp' as identifiers
                    target: conn.node, // assuming 'node' is the index or 'smp' of the target node
                    weight: conn.weight
                });
                });
            });

            // scale weights to [0,1]
            const maxWeight = max(links, d => d.weight);
            links.forEach(link => link.weight /= maxWeight);
  
            const simulation = forceSimulation(nodes)
                .force("link", forceLink(links).id(d => d.id)) // Use 'id' or 'smp' depending on your choice above
                .force("charge", forceManyBody().strength(-500))
                .force("center", forceCenter(svgWidth / 2, svgHeight / 2));


            // Clear the SVG to prevent duplicate elements on data update
            mapPointsContainer.selectAll('*').remove();

            const node = mapPointsContainer.append("g")
                .selectAll("text")
                .data(nodes, d => d.smp) // Ensure this matches how you're binding data
                .join("text")
                .text(d => d.smp)
                .attr("fill", "white")
                .call(dragBehavior(simulation));

            const link = mapPointsContainer.append("g")
                .attr("stroke", "black")
                .selectAll("line")
                .data(links)
                .join("line")
                .attr("stroke-width", d => d.weight * 2);
              
            simulation.on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);
                
                node
                    .attr("x", d => d.x)
                    .attr("y", d => d.y);
                });
                  
            function dragBehavior(simulation) {
                function dragstarted(event) {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    event.subject.fx = event.subject.x;
                    event.subject.fy = event.subject.y;
                }

                function dragged(event) {
                    event.subject.fx = event.x;
                    event.subject.fy = event.y;
                }

                function dragended(event) {
                    if (!event.active) simulation.alphaTarget(0);
                    event.subject.fx = null;
                    event.subject.fy = null;
                }

            return drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended);
            }

            return () => {
                simulation.stop();
            };

        } else {

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

            mapTexts = mapPointsContainer.selectAll('text.map')
                .data(mapData, d => d.smp + "-" + d.lvl)
                .join(
                    enter => enter.append('text')
                                .attr('class', d => d.lvl === 'm' ? 'map textMap' : 'map textBasemap')
                                .attr('x', d => xScaleZoomed(d.x))
                                .attr('y', d => yScaleZoomed(d.y))
                                .text(d => d.smp)
                                .attr('data-smp', d => d.smp) // use for rect sizing
                                .on('click', (event, d) => handleClickRef.current(event, d))
                                .on('dblclick', (event, d) => handleDoubleClickRef.current(event, d)),
                    update => update.transition().duration(transitionDuration)
                                    .attr('x', d => xScaleZoomed(d.x))
                                    .attr('y', d => yScaleZoomed(d.y)),
                    exit => exit.transition().duration(transitionDuration)
                                .style('opacity', 0)
                                .remove()
                );

            mapTexts.on('click', (event, d) => handleClickRef.current(event, d))
                    .on('dblclick', (event, d) => handleDoubleClickRef.current(event, d));

            const rectStrokeWidth = 2;

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

            return () => {
                mapPointsContainer.selectAll('text.map').on('click', null).on('dblclick', null);
            };
        }

    }, [mapData, isSpreadMeterHovered, isOutlierMeterHovered, maxPair, maxZscoreSample, selectMode, selections]);

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


