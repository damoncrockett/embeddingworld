import { useEffect, useState } from 'react';
import { findShortestPath, getPathWeights, weightBinner } from '../../utils/geometry';
import { reduceEmbeddings } from '../../utils/reduce';

export default function usePathsData({
  reducer,
  mapList,
  basemapLocked,
  selections,
  ranks
}) {
  const [graphData, setGraphData] = useState({ lines: [], path: [] });
  const [pathSmpsAndWeightChars, setPathSmpsAndWeightChars] = useState({
    smps: [],
    weights: [],
  });

  useEffect(() => {
    if (reducer !== 'paths') {
      setGraphData({ lines: [], path: [] });
      setPathSmpsAndWeightChars({ smps: [], weights: [] });
      return;
    }

    const result = reduceEmbeddings(mapList, basemapLocked, reducer, selections, ranks);
    if (!result || !result.graph || !result.coords) {
      setGraphData({ lines: [], path: [] });
      setPathSmpsAndWeightChars({ smps: [], weights: [] });
      return;
    }

    const { graph, coords } = result;
    const linesData = [];
    const addedLines = new Set();

    graph.forEach((value, key) => {
      const startPoint = {
        x: coords[key][0],
        y: coords[key][1],
        smp: mapList[key]?.smp,
      };
      if (!startPoint) return;

      value.connections.forEach((conn) => {
        const endPoint = {
          x: coords[conn.node][0],
          y: coords[conn.node][1],
          smp: mapList[conn.node]?.smp,
        };
        if (!endPoint) return;

        // ID to prevent duplicates
        const lineId = [startPoint.smp, endPoint.smp].sort().join('-');
        if (!addedLines.has(lineId)) {
          linesData.push({
            source: startPoint,
            target: endPoint,
            weight: weightBinner(conn.weight),
          });
          addedLines.add(lineId);
        }
      });
    });

    if (selections[0] && selections[1]) {
      const startNode = mapList.findIndex((item) => item.smp === selections[0]);
      const endNode = mapList.findIndex((item) => item.smp === selections[1]);
      if (startNode === -1 || endNode === -1) {
        setGraphData({ lines: linesData, path: [] });
        setPathSmpsAndWeightChars({ smps: [], weights: [] });
        return;
      }

      const path = findShortestPath(graph, startNode, endNode);
      if (path && path.length >= 2) {
        const pathWeights = getPathWeights(graph, path);
        const weightCharacters = pathWeights.map((w) => weightBinner(w, 'character'));
        const smpPath = path.map((node) => mapList[node].smp);

        const pathSegments = [];
        for (let i = 0; i < smpPath.length - 1; i++) {
          pathSegments.push(`${smpPath[i]}-${smpPath[i + 1]}`);
          pathSegments.push(`${smpPath[i + 1]}-${smpPath[i]}`);
        }

        setGraphData({ lines: linesData, path: pathSegments });
        setPathSmpsAndWeightChars({
          smps: smpPath,
          weights: weightCharacters,
        });
      } else {
        setGraphData({ lines: linesData, path: [] });
        setPathSmpsAndWeightChars({ smps: [], weights: [] });
      }
    } else {
      setGraphData({ lines: linesData, path: [] });
      setPathSmpsAndWeightChars({ smps: [], weights: [] });
    }

  }, [reducer, mapList, basemapLocked, selections, ranks]);

  return { graphData, pathSmpsAndWeightChars };
}
