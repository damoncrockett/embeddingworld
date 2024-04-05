import React, { useEffect, useRef } from 'react';
import { select } from 'd3-selection';

export default function PathString({ pathString }) {
  const ref = useRef();

  function isSeparator(item) {
    const separators = ["-","=","≡"]; 
    return separators.includes(item);
  }
  
  useEffect(() => {
    const container = select(ref.current);
    const spans = container.selectAll("span")
        .data(pathString, (d, i) => `${d}-${i}`);

    spans.enter()
      .append("span")
      .attr("class", d => isSeparator(d) ? "pathString sep" : "pathString")
      .text(d => d)
      .style("opacity", 0)
      .style("color", d => isSeparator(d) ? "coral" : "white")
      .transition().duration(500) 
      .style("opacity", 1);

    spans.exit()
      .transition().duration(500)
      .style("opacity", 0)
      .remove();

  }, [pathString]);

  return <div id='pathStringContainer' ref={ref}></div>;
}
