import React, { useRef, useEffect } from "react";
import { transition } from "d3-transition";
import { select } from "d3-selection";
import { zoom, zoomTransform, zoomIdentity } from "d3-zoom";
import { scaleLinear } from "d3-scale";
import { min, max } from "d3-array";
import { calculateLineEndpoints } from "../../utils/geometry";
import { truncateStringByZoomLevel } from "../../utils/text";
import { map, pad } from "lodash";

const svgHeight = window.innerHeight;
const svgWidth = window.innerWidth;

const padding = { top: 200, right: 160, bottom: 40, left: 40 };
const rectStrokeWidth = 2;
const rectXAdjustment = 5;
const rectYAdjustment = 20;

let xDomain,
  yDomain,
  xScale,
  yScale,
  mapTexts,
  mapPointsContainer,
  xScaleZoomed,
  yScaleZoomed,
  textGroup,
  linesGroup,
  selectionsGroup,
  axesGroup;

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
  reducer,
}) {
  const svgRef = useRef(null);
  const zoomRef = useRef();
  const zoomLevelRef = useRef();

  const zoomScaleMin = 0.25;
  const zoomScaleMax = 7.5;

  const clickTimer = useRef(null);
  const handleClickRef = useRef();
  const handleDoubleClickRef = useRef();

  const reducerRef = useRef(reducer);
  const selectionsRef = useRef(selections);

  useEffect(() => {
    reducerRef.current = reducer;
    selectionsRef.current = selections;
  }, [reducer, selections]);

  useEffect(() => {
    const handleClick = (event, d) => {
      if (clickTimer.current === null) {
        clickTimer.current = setTimeout(() => {
          if (selectMode) {
            if (!selections.includes(d.smp)) {
              let newSelections;
              const nullIndex = selections.indexOf(null);
              if (reducer === "nearest") {
                // new selection pushes others down and first null (if any) gets filled
                if (nullIndex !== -1) {
                  newSelections = [
                    d.smp,
                    ...selections.slice(0, nullIndex),
                    ...selections.slice(nullIndex + 1),
                  ];
                } else {
                  newSelections = [
                    d.smp,
                    ...selections.slice(0, selections.length - 1),
                  ];
                }
              } else {
                // new selection fills first null or replaces last selection
                if (nullIndex !== -1) {
                  newSelections = [
                    ...selections.slice(0, nullIndex),
                    d.smp,
                    ...selections.slice(nullIndex + 1),
                  ];
                } else {
                  newSelections = [
                    ...selections.slice(0, selections.length - 1),
                    d.smp,
                  ];
                }
              }
              setSelections(newSelections);
            }
          } else {
            setClickChange({ changeType: "switch", smp: d.smp });
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
        setClickChange({ changeType: "remove", smp: d.smp });
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

    const yMidpoint = (yDomain[0] + yDomain[1]) / 2;
    const xMidpoint = (xDomain[0] + xDomain[1]) / 2;

    axesGroup
      .selectAll("line.xAxis")
      .attr("x1", xScaleZoomed(xDomain[0]))
      .attr("x2", xScaleZoomed(xDomain[1]))
      .attr(
        "y1",
        selectionsRef.current[2] && selectionsRef.current[3]
          ? yScaleZoomed(yMidpoint)
          : yScaleZoomed(0),
      )
      .attr(
        "y2",
        selectionsRef.current[2] && selectionsRef.current[3]
          ? yScaleZoomed(yMidpoint)
          : yScaleZoomed(0),
      );

    axesGroup
      .selectAll("line.yAxis")
      .attr("x1", xScaleZoomed(xMidpoint))
      .attr("x2", xScaleZoomed(xMidpoint))
      .attr("y1", yScaleZoomed(yDomain[0]))
      .attr("y2", yScaleZoomed(yDomain[1]));

    select(svgRef.current)
      .selectAll("text.map")
      .attr("x", (d) => xScaleZoomed(d.x))
      .attr("y", (d) => yScaleZoomed(d.y))
      .attr("transform", (d) =>
        reducerRef.current === "project" &&
        !(selectionsRef.current[2] && selectionsRef.current[3])
          ? `rotate(-45, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`
          : `rotate(0, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`,
      );

    select(svgRef.current)
      .selectAll("line.connectionLine")
      .attr("x1", (d) => xScaleZoomed(d.source.x))
      .attr("y1", (d) => yScaleZoomed(d.source.y))
      .attr("x2", (d) => xScaleZoomed(d.target.x))
      .attr("y2", (d) => yScaleZoomed(d.target.y));

    select(svgRef.current)
      .selectAll("rect.selectedRect")
      .attr("x", (d) => xScaleZoomed(d.x) - rectXAdjustment)
      .attr("y", (d) => yScaleZoomed(d.y) - rectYAdjustment)
      .attr("transform", (d) =>
        reducerRef.current === "project" &&
        !(selectionsRef.current[2] && selectionsRef.current[3])
          ? `rotate(-45, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`
          : `rotate(0, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`,
      );

    select(svgRef.current)
      .selectAll("text.selectedText")
      .attr("x", (d) => xScaleZoomed(d.x))
      .attr("y", (d) => yScaleZoomed(d.y))
      .attr("transform", (d) =>
        reducerRef.current === "project" &&
        !(selectionsRef.current[2] && selectionsRef.current[3])
          ? `rotate(-45, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`
          : `rotate(0, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`,
      );

    const zoomScale = transform.k;
    const zoomLevel = Math.floor(
      (zoomScale - zoomScaleMin) / ((zoomScaleMax - zoomScaleMin) / 5),
    );

    if (zoomLevelRef.current !== zoomLevel) {
      zoomLevelRef.current = zoomLevel;
      select(svgRef.current)
        .selectAll("text.map")
        .select("tspan")
        .text((d) => truncateStringByZoomLevel(d.smp, zoomLevel));
      select(svgRef.current)
        .selectAll("text.selectedText")
        .select("tspan")
        .text((d) => truncateStringByZoomLevel(d.smp, zoomLevel));
      select(svgRef.current)
        .selectAll("rect.selectedRect")
        .attr(
          "width",
          (d, i) =>
            select(mapPointsContainer.selectAll("text.selectedText").nodes()[i])
              .node()
              .getBBox().width + 10,
        )
        .attr(
          "height",
          (d, i) =>
            select(mapPointsContainer.selectAll("text.selectedText").nodes()[i])
              .node()
              .getBBox().height + 10,
        );
    }
  };

  const resetZoom = () => {
    select(svgRef.current)
      .transition()
      .duration(transitionDuration)
      .call(zoomRef.current.transform, zoomIdentity);
  };

  useEffect(() => {
    const svg = select(svgRef.current);

    mapPointsContainer = svg.select(".mapPointsContainer");
    if (mapPointsContainer.empty()) {
      mapPointsContainer = svg.append("g").attr("class", "mapPointsContainer");
    }

    axesGroup = mapPointsContainer.select("g.axesGroup");
    if (axesGroup.empty()) {
      axesGroup = mapPointsContainer.append("g").attr("class", "axesGroup");
    }

    textGroup = mapPointsContainer.select("g.textGroup");
    if (textGroup.empty()) {
      textGroup = mapPointsContainer.append("g").attr("class", "textGroup");
    }

    // lines will always sit below selections
    linesGroup = mapPointsContainer.select("g.linesGroup");
    if (linesGroup.empty()) {
      linesGroup = mapPointsContainer.append("g").attr("class", "linesGroup");
    }

    selectionsGroup = mapPointsContainer.select("g.selectionsGroup");
    if (selectionsGroup.empty()) {
      selectionsGroup = mapPointsContainer
        .append("g")
        .attr("class", "selectionsGroup");
    }

    const initialZoom = zoom()
      .extent([
        [0, 0],
        [svgWidth, svgHeight],
      ])
      .scaleExtent([zoomScaleMin, zoomScaleMax])
      .on("zoom", handleZoom);

    zoomRef.current = initialZoom;

    svg.call(initialZoom).on("dblclick.zoom", null);
  }, []);

  useEffect(() => {
    if (!mapData) return;

    xDomain = [min(mapData, (d) => d.x), max(mapData, (d) => d.x)];
    yDomain = [min(mapData, (d) => d.y), max(mapData, (d) => d.y)];

    xScale = scaleLinear()
      .domain(xDomain)
      .range([padding.left, svgWidth - padding.right]);

    yScale = scaleLinear()
      .domain(yDomain)
      .range([svgHeight - padding.bottom, padding.top]);

    xScaleZoomed = zoomTransform(svgRef.current).rescaleX(xScale);
    yScaleZoomed = zoomTransform(svgRef.current).rescaleY(yScale);

    const zoomScale = zoomTransform(svgRef.current).k;
    const zoomLevel = Math.floor(
      (zoomScale - zoomScaleMin) / ((zoomScaleMax - zoomScaleMin) / 5),
    );

    // map points
    mapTexts = textGroup
      .selectAll("text.map")
      .data(mapData, (d) => d.smp + "-" + d.lvl)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("class", (d) =>
              d.lvl === "m" ? "map textMap" : "map textBasemap",
            )
            .attr("x", (d) => xScaleZoomed(d.x))
            .attr("y", (d) => yScaleZoomed(d.y))
            .attr("data-smp", (d) => d.smp) // use for rect sizing
            .attr("fill", "coral")
            .attr("transform", (d) =>
              reducerRef.current === "project" &&
              !(selectionsRef.current[2] && selectionsRef.current[3])
                ? `rotate(-45, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`
                : `rotate(0, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`,
            )
            .on("click", (event, d) => handleClickRef.current(event, d))
            .on("dblclick", (event, d) =>
              handleDoubleClickRef.current(event, d),
            )
            .call((enter) =>
              enter
                .transition()
                .duration(transitionDuration * 2)
                .attr("fill", (d) => (d.lvl === "m" ? "white" : "grey")),
            )
            .each(function (d) {
              select(this)
                .append("tspan")
                .text(truncateStringByZoomLevel(d.smp, zoomLevel));
              select(this).append("title").text(d.smp);
            }),
        (update) =>
          update
            .transition()
            .duration(transitionDuration)
            .attr("x", (d) => xScaleZoomed(d.x))
            .attr("y", (d) => yScaleZoomed(d.y))
            .attr("transform", (d) =>
              reducerRef.current === "project" &&
              !(selectionsRef.current[2] && selectionsRef.current[3])
                ? `rotate(-45, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`
                : `rotate(0, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`,
            ),
        (exit) =>
          exit
            .transition()
            .duration(transitionDuration)
            .style("opacity", 0)
            .remove(),
      );

    mapTexts
      .on("click", (event, d) => handleClickRef.current(event, d))
      .on("dblclick", (event, d) => handleDoubleClickRef.current(event, d));

    return () => {
      textGroup.selectAll("text.map").on("click", null).on("dblclick", null);
    };
  }, [mapData, selectMode, selections]);

  useEffect(() => {
    if (mapData && mapData.length > 0) {
      xScaleZoomed = zoomTransform(svgRef.current).rescaleX(xScale);
      yScaleZoomed = zoomTransform(svgRef.current).rescaleY(yScale);
    } else {
      return;
    }

    const yMidpoint = (yDomain[0] + yDomain[1]) / 2;
    const xMidpoint = (xDomain[0] + xDomain[1]) / 2;

    if (reducer === "project" && selections[0] && selections[1]) {
      axesGroup
        .selectAll("line.xAxis")
        .data([0])
        .join(
          (enter) =>
            enter
              .append("line")
              .attr("class", "xAxis")
              .attr("x1", xScaleZoomed(xDomain[0]))
              .attr(
                "y1",
                selections[2] && selections[3]
                  ? yScaleZoomed(yMidpoint)
                  : yScaleZoomed(0),
              )
              .attr("x2", xScaleZoomed(xDomain[1]))
              .attr(
                "y2",
                selections[2] && selections[3]
                  ? yScaleZoomed(yMidpoint)
                  : yScaleZoomed(0),
              )
              .attr("stroke", "black")
              .attr("stroke-width", 1)
              .attr("stroke-dasharray", "5,5"),
          (update) =>
            update
              .transition()
              .duration(transitionDuration)
              .attr("x1", xScaleZoomed(xDomain[0]))
              .attr(
                "y1",
                selections[2] && selections[3]
                  ? yScaleZoomed(yMidpoint)
                  : yScaleZoomed(0),
              )
              .attr("x2", xScaleZoomed(xDomain[1]))
              .attr(
                "y2",
                selections[2] && selections[3]
                  ? yScaleZoomed(yMidpoint)
                  : yScaleZoomed(0),
              ),
        );
    } else {
      axesGroup.selectAll("line.xAxis").remove();
    }

    if (
      reducer === "project" &&
      selections[0] &&
      selections[1] &&
      selections[2] &&
      selections[3]
    ) {
      axesGroup
        .selectAll("line.yAxis")
        .data([0])
        .join(
          (enter) =>
            enter
              .append("line")
              .attr("class", "yAxis")
              .attr("x1", xScaleZoomed(xMidpoint))
              .attr("y1", yScaleZoomed(yDomain[0]))
              .attr("x2", xScaleZoomed(xMidpoint))
              .attr("y2", yScaleZoomed(yDomain[1]))
              .attr("stroke", "black")
              .attr("stroke-width", 1)
              .attr("stroke-dasharray", "5,5"),
          (update) =>
            update
              .transition()
              .duration(transitionDuration)
              .attr("x1", xScaleZoomed(xMidpoint))
              .attr("y1", yScaleZoomed(yDomain[0]))
              .attr("x2", xScaleZoomed(xMidpoint))
              .attr("y2", yScaleZoomed(yDomain[1])),
        );
    } else {
      axesGroup.selectAll("line.yAxis").remove();
    }
  }, [reducer, selections, mapData]);

  useEffect(() => {
    if (mapData) {
      xScaleZoomed = zoomTransform(svgRef.current).rescaleX(xScale);
      yScaleZoomed = zoomTransform(svgRef.current).rescaleY(yScale);
    }

    // path lines
    linesGroup
      .selectAll("line.connectionLine")
      .data(graphData.lines, (d) => `${d.source.smp}-${d.target.smp}`)
      .join(
        (enter) => {
          const initialEnter = enter
            .append("line")
            .attr("class", "connectionLine")
            .attr("stroke", "white")
            .attr("x1", (d) => xScaleZoomed(d.source.x))
            .attr("y1", (d) => yScaleZoomed(d.source.y))
            .attr("x2", (d) => xScaleZoomed(d.target.x))
            .attr("y2", (d) => yScaleZoomed(d.target.y))
            .attr("stroke-width", (d) => d.weight)
            .attr("stroke-opacity", 0);

          initialEnter
            .transition()
            .delay(transitionDuration)
            .duration(transitionDuration)
            .attr("stroke-opacity", 0.5);

          initialEnter
            .transition()
            .delay(transitionDuration * 2)
            .duration(transitionDuration)
            .attr("stroke", (d) =>
              graphData.path.includes(`${d.source.smp}-${d.target.smp}`)
                ? "coral"
                : "black",
            );
        },
        (update) =>
          update
            .transition()
            .duration(transitionDuration)
            .attr("x1", (d) => xScaleZoomed(d.source.x))
            .attr("y1", (d) => yScaleZoomed(d.source.y))
            .attr("x2", (d) => xScaleZoomed(d.target.x))
            .attr("y2", (d) => yScaleZoomed(d.target.y))
            .attr("stroke-width", (d) => d.weight)
            .attr("stroke", (d) =>
              graphData.path.includes(`${d.source.smp}-${d.target.smp}`)
                ? "coral"
                : "black",
            ),
        (exit) =>
          exit
            .transition()
            .duration(transitionDuration)
            .attr("stroke-opacity", 0) // Fade out before removing
            .remove(),
      );
  }, [graphData]);

  useEffect(() => {
    if (!selectionsData) return;

    if (mapData) {
      xScaleZoomed = zoomTransform(svgRef.current).rescaleX(xScale);
      yScaleZoomed = zoomTransform(svgRef.current).rescaleY(yScale);
    }

    const selectedTextSize = selectionsData
      .map((d) => {
        const textElement = mapPointsContainer
          .select(`text[data-smp="${d.smp}"]`)
          .node();
        if (!textElement) return null;
        const bbox = textElement.getBBox();
        return { smp: d.smp, width: bbox.width, height: bbox.height };
      })
      .filter(Boolean);

    selectionsGroup
      .selectAll("rect.selectedRect")
      .data(selectionsData, (d) => d.smp + "-" + d.lvl)
      .join(
        (enter) => {
          enter
            .append("rect")
            .attr("class", "selectedRect")
            .attr("x", (d, i) => xScaleZoomed(d.x) - rectXAdjustment)
            .attr("y", (d, i) => yScaleZoomed(d.y) - rectYAdjustment)
            .attr("width", (d, i) => selectedTextSize[i].width + 10)
            .attr("height", (d, i) => selectedTextSize[i].height + 10)
            .attr("rx", 5)
            .attr("fill", "white")
            .attr("transform", (d) =>
              reducerRef.current === "project" &&
              !(selectionsRef.current[2] && selectionsRef.current[3])
                ? `rotate(-45, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`
                : `rotate(0, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`,
            )
            .attr("stroke", "coral")
            .attr("stroke-width", rectStrokeWidth)
            .style("opacity", 0)
            .call((enter) =>
              enter
                .transition()
                .duration(transitionDuration)
                .style("opacity", 1),
            );
        },
        (update) => {
          update
            .transition()
            .duration(transitionDuration)
            .attr("x", (d, i) => xScaleZoomed(d.x) - rectXAdjustment)
            .attr("y", (d, i) => yScaleZoomed(d.y) - rectYAdjustment)
            .attr("transform", (d) =>
              reducerRef.current === "project" &&
              !(selectionsRef.current[2] && selectionsRef.current[3])
                ? `rotate(-45, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`
                : `rotate(0, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`,
            );
        },
        (exit) => {
          exit
            .transition()
            .duration(transitionDuration)
            .style("opacity", 0)
            .remove();
        },
      );

    const zoomScale = zoomTransform(svgRef.current).k;
    const zoomLevel = Math.floor(
      (zoomScale - zoomScaleMin) / ((zoomScaleMax - zoomScaleMin) / 5),
    );

    selectionsGroup
      .selectAll("text.selectedText")
      .data(selectionsData, (d) => d.smp + "-" + d.lvl)
      .join(
        (enter) =>
          enter
            .append("text")
            .attr("x", (d) => xScaleZoomed(d.x))
            .attr("y", (d) => yScaleZoomed(d.y))
            .attr("class", "selectedText")
            .style("fill", "black")
            .attr("transform", (d) =>
              reducerRef.current === "project" &&
              !(selectionsRef.current[2] && selectionsRef.current[3])
                ? `rotate(-45, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`
                : `rotate(0, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`,
            )
            .style("opacity", 0)
            .call((enter) =>
              enter
                .transition()
                .duration(transitionDuration)
                .style("opacity", 1),
            )
            .each(function (d) {
              select(this)
                .append("tspan")
                .text(truncateStringByZoomLevel(d.smp, zoomLevel));
              select(this).append("title").text(d.smp);
            }),
        (update) =>
          update
            .transition()
            .duration(transitionDuration)
            .attr("x", (d) => xScaleZoomed(d.x))
            .attr("y", (d) => yScaleZoomed(d.y))
            .attr("transform", (d) =>
              reducerRef.current === "project" &&
              !(selectionsRef.current[2] && selectionsRef.current[3])
                ? `rotate(-45, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`
                : `rotate(0, ${xScaleZoomed(d.x)}, ${yScaleZoomed(d.y)})`,
            ),
        (exit) =>
          exit
            .transition()
            .duration(transitionDuration)
            .style("opacity", 0)
            .remove(),
      );
  }, [selectionsData]);

  useEffect(() => {
    // highlight max pair
    if (isSpreadMeterHovered && maxPair && maxPair.length === 2) {
      setTimeout(() => {
        // to ensure text elements are already drawn
        const spreadRectData = maxPair
          .map((smp) => {
            const textElement = mapPointsContainer
              .select(`text[data-smp="${smp}"]`)
              .node();
            if (!textElement) return null;
            const bbox = textElement.getBBox();
            return { smp, bbox };
          })
          .filter(Boolean); // remove null values

        spreadRectData.forEach(({ smp, bbox }) => {
          mapPointsContainer
            .append("rect")
            .attr("class", "maxPairRect")
            .attr("x", bbox.x - 5)
            .attr("y", bbox.y - 5)
            .attr("width", bbox.width + 10)
            .attr("height", bbox.height + 10)
            .attr("rx", 5)
            .attr("fill", "white")
            .attr("stroke", "coral")
            .attr("stroke-width", rectStrokeWidth)
            .attr("data-smp", smp)
            .style("opacity", 0)
            .transition()
            .duration(transitionDuration)
            .style("opacity", 1);
        });

        if (spreadRectData.length === 2) {
          const { lineStart, lineEnd } = calculateLineEndpoints(
            spreadRectData[0].bbox,
            spreadRectData[1].bbox,
            rectStrokeWidth,
          );

          mapPointsContainer
            .append("line")
            .attr("class", "maxPairLine")
            .attr("x1", lineStart.x)
            .attr("y1", lineStart.y)
            .attr("x2", lineEnd.x)
            .attr("y2", lineEnd.y)
            .attr("stroke", "coral")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .style("opacity", 0)
            .transition()
            .duration(transitionDuration)
            .style("opacity", 1);
        }

        maxPair.forEach((smp) => {
          const originalTextElement = mapPointsContainer.select(
            `text[data-smp="${smp}"]`,
          );
          if (!originalTextElement.empty()) {
            const bbox = originalTextElement.node().getBBox();
            mapPointsContainer
              .append("text")
              .attr("x", bbox.x + bbox.width / 2)
              .attr("y", bbox.y + bbox.height / 2)
              .attr("class", "highlighted-text")
              .style("fill", "black")
              .attr("text-anchor", "middle")
              .attr("dy", "0.35em")
              .text(originalTextElement.select("tspan").text())
              .attr("data-smp", smp)
              .style("opacity", 0)
              .transition()
              .duration(transitionDuration)
              .style("opacity", 1);
          }
        });
      }, 0); // timeout is 0 but this will still put the code at the end of the event loop
    } else {
      mapPointsContainer
        .selectAll(".maxPairRect")
        .transition()
        .duration(transitionDuration)
        .style("opacity", 0)
        .remove();
      mapPointsContainer
        .selectAll(".maxPairLine")
        .transition()
        .duration(transitionDuration)
        .style("opacity", 0)
        .remove();
      mapPointsContainer
        .selectAll(".highlighted-text[data-smp]")
        .transition()
        .duration(transitionDuration)
        .style("opacity", 0)
        .remove();
    }
  }, [isSpreadMeterHovered, maxPair]);

  useEffect(() => {
    // highlight max z-score sample
    if (isOutlierMeterHovered && maxZscoreSample) {
      // exactly as above, but for a single item only, and thus no line is drawn
      setTimeout(() => {
        const textElement = mapPointsContainer
          .select(`text[data-smp="${maxZscoreSample}"]`)
          .node();
        if (textElement) {
          const bbox = textElement.getBBox();
          mapPointsContainer
            .append("rect")
            .attr("class", "maxZscoreRect")
            .attr("x", bbox.x - 5)
            .attr("y", bbox.y - 5)
            .attr("width", bbox.width + 10)
            .attr("height", bbox.height + 10)
            .attr("rx", 5)
            .attr("fill", "white")
            .attr("stroke", "coral")
            .attr("stroke-width", rectStrokeWidth)
            .attr("data-smp", maxZscoreSample)
            .style("opacity", 0)
            .transition()
            .duration(transitionDuration)
            .style("opacity", 1);

          const originalTextElement = mapPointsContainer.select(
            `text[data-smp="${maxZscoreSample}"]`,
          );
          if (!originalTextElement.empty()) {
            const bbox = originalTextElement.node().getBBox();
            mapPointsContainer
              .append("text")
              .attr("x", bbox.x + bbox.width / 2)
              .attr("y", bbox.y + bbox.height / 2)
              .attr("class", "highlighted-text")
              .style("fill", "black")
              .attr("text-anchor", "middle")
              .attr("dy", "0.35em")
              .text(originalTextElement.select("tspan").text())
              .attr("data-smp", maxZscoreSample)
              .style("opacity", 0)
              .transition()
              .duration(transitionDuration)
              .style("opacity", 1);
          }
        }
      }, 0);
    } else {
      mapPointsContainer
        .selectAll(".maxZscoreRect")
        .transition()
        .duration(transitionDuration)
        .style("opacity", 0)
        .remove();
      mapPointsContainer
        .selectAll(".highlighted-text[data-smp]")
        .transition()
        .duration(transitionDuration)
        .style("opacity", 0)
        .remove();
    }
  }, [isOutlierMeterHovered, maxZscoreSample]);

  return (
    <>
      <button id="reset-zoom" className="material-icons" onClick={resetZoom}>
        flip_camera_ios
      </button>
      <svg
        id="svg-canvas"
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
      ></svg>
    </>
  );
}
