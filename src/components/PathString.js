import React, { useEffect, useRef } from 'react';
import { select } from 'd3-selection';

export default function PathString({ pathString, mapList }) {
  const ref = useRef();

  const isSeparator = item => {
    const separators = ["-","=","≡"]; 
    return separators.includes(item);
  }

  const getLevelFromMapList = (item) => {
    const level = mapList.find((d) => d.smp === item);
    return level ? level.lvl : 0;
  }
  
  useEffect(() => {
    const container = select(ref.current);
    const spans = container.selectAll("span")
        .data(pathString, (d, i) => `${d}-${i}`);

    spans.enter()
      .append("span")
      .attr("class", d => isSeparator(d) ? "pathString sep" : getLevelFromMapList(d) === "m" ? "pathString m" : "pathString b")
      .text(d => d)
      .style("opacity", 0)
      .transition().duration(500) 
      .style("opacity", 1);

    spans.exit()
      .transition().duration(500)
      .style("opacity", 0)
      .remove();

  }, [pathString]);

  return <div id='pathStringContainer' ref={ref}></div>;
}
