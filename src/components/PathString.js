import React, { useEffect, useRef } from 'react';
import { select } from 'd3-selection';

const transitionDuration = 750;

export default function PathString({ pathSmpsAndWeightChars, mapList }) {
  const ref = useRef();

  const getLevelFromMapList = (item) => {
    const level = mapList.find((d) => d.smp === item);
    return level ? level.lvl : 0;
  }
  
  useEffect(() => {
    const container = select(ref.current);
    const segments = container.selectAll("div.segment")
      .data(pathSmpsAndWeightChars.smps, (d, i) => `${d}-${i}`);
  
    const exitSelection = segments.exit();
    let exits = exitSelection.size(); 
  
    if (exits === 0) {
      enterNewElements();
    } else {
      exitSelection.transition().duration(transitionDuration)
        .style("opacity", 0)
        .on("end", function() {
          exits -= 1; 
          if (exits === 0) {
            enterNewElements();
          }
        })
        .remove();
    }

    segments.each(function(d) {
      const currentClass = getLevelFromMapList(d) === "m" ? "pathString m" : "pathString b";
      select(this).select("span.pathString")
        .attr("class", currentClass)
    });
  
    function enterNewElements() {
      const enteredSegments = segments.enter()
        .append("div")
        .attr("class", "segment")
        .style("opacity", 0);
  
      enteredSegments.append("span")
        .attr("class", d => getLevelFromMapList(d) === "m" ? "pathString m" : "pathString b")
        .text(s => s.length > 20 ? s.substring(0, 20) + '...' : s)
  
      enteredSegments.append("span")
        .attr("class", "sep")
        .text((d, i) => pathSmpsAndWeightChars.weights[i] ? pathSmpsAndWeightChars.weights[i] : "");
  
      enteredSegments.transition().duration(transitionDuration)
        .style("opacity", 1);
    }
  }, [pathSmpsAndWeightChars, mapList]);  

  return <div id='pathStringContainer' ref={ref}></div>;
}
