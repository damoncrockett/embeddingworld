import React, { useEffect, useRef, useState } from 'react';
import { select } from 'd3-selection';

const transitionDuration = 750;

export default function PathString({ pathSmpsAndWeightChars, mapList, reducer }) {
  const ref = useRef();

  useEffect(() => {

    const container = select(ref.current);
    const segments = container.selectAll("div.segment")
      .data(pathSmpsAndWeightChars.smps, (d, i) => `${d}-${i}`);
  
    // Handle exits
    segments.exit()
      .transition()
      .duration(transitionDuration)
      .style("opacity", 0)
      .remove();

    // Update existing segments
    segments.each(function(d) {
      const currentClass = getLevelFromMapList(d) === "m" ? "pathString m" : "pathString b";
      select(this)
        .select("span.pathString")
        .attr("class", currentClass);
    });
  
    // Handle enters
    const enteredSegments = segments.enter()
      .append("div")
      .attr("class", "segment")
      .style("opacity", 0);

    enteredSegments.append("span")
      .attr("class", d => getLevelFromMapList(d) === "m" ? "pathString m" : "pathString b")
      .text(s => s.length > 20 ? s.substring(0, 20) + '...' : s);

    enteredSegments.append("span")
      .attr("class", "sep")
      .text((d, i) => {
        return i < pathSmpsAndWeightChars.smps.length - 1 
          ? (pathSmpsAndWeightChars.weights[i] || '—')
          : '';
      });

    // After content is added, wait a tick for layout
    setTimeout(() => {
      if (ref.current) {
        select(ref.current)
          .style('visibility', 'visible')
          .transition()
          .duration(transitionDuration)
          .style('opacity', 1);
      }
    }, transitionDuration);

    // Fade in new segments
    enteredSegments.transition()
      .duration(transitionDuration)
      .style("opacity", 1);

  }, [pathSmpsAndWeightChars, mapList]);  

  const getLevelFromMapList = (item) => {
    const level = mapList.find((d) => d.smp === item);
    return level ? level.lvl : 0;
  }

  return (
    <div 
      id='pathStringContainer' 
      className={reducer === 'paths' ? 'visible' : ''}
      ref={ref}
    />
  );
}
