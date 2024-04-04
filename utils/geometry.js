export function euclideanDistance(arr1, arr2) {
    return Math.sqrt(arr1.reduce((sum, current, index) => sum + Math.pow(current - arr2[index], 2), 0));
}

export function cosineDistance(arrA, arrB, outmetric = 'distance') {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < arrA.length; i++) {
      dotProduct += arrA[i] * arrB[i]; 
      normA += arrA[i] * arrA[i]; 
      normB += arrB[i] * arrB[i]; 
    }
  
    normA = Math.sqrt(normA); 
    normB = Math.sqrt(normB); 
  
    const cosineSimilarity = dotProduct / (normA * normB);
    const cosineDistance = 1 - cosineSimilarity;
  
    return outmetric === 'distance' ? cosineDistance : cosineSimilarity;
  } 
  
export function angleBetweenVectors(arrA, arrB) {
    const cosineSimilarity = cosineDistance(arrA, arrB, 'similarity');
    
    // Clamp the cosine similarity to avoid errors due to floating point arithmetic
    const clampedCosineSimilarity = Math.max(-1, Math.min(1, cosineSimilarity));
    
    // acos returns the angle in radians
    return Math.acos(clampedCosineSimilarity);
}

export function polarToCartesian(r, theta) {
  const x = r * Math.cos(theta);
  const y = r * Math.sin(theta);
  return [x, y];
}

function generatePairwiseComparisons(length) {
    const pairs = [];
    for (let i = 0; i < length - 1; i++) {
        for (let j = i + 1; j < length; j++) {
            pairs.push([i, j]);
        }
    }
    return pairs;
}

export function getMaxPairwiseDistance(arrays, distanceFunctionName) {

    let distance, pair;

    if (arrays.length < 2) {
        
        distance = 0;
        pair = null;

    } else {

      const distanceFunction = distanceFunctionName === 'cosine' ? cosineDistance : euclideanDistance;

      const pairs = generatePairwiseComparisons(arrays.length);
      const distances = pairs.map(pair => ({
          pair,
          distance: distanceFunction(arrays[pair[0]], arrays[pair[1]])
      }));

      distance = Math.max(...distances.map(d => d.distance));
      pair = distances.find(d => d.distance === distance).pair;

    }
    return { distance, pair };
  }

//
//
//
//
//

  export function calculateLineEndpoints(rect1, rect2, rectStrokeWidth = 1) {
    let lineStart = {}, lineEnd = {};
    const offset = rectStrokeWidth + 2; // Half the stroke width to offset the line inside the rect

    // Check if there is horizontal space between rects
    if (rect1.x + rect1.width < rect2.x || rect2.x + rect2.width < rect1.x) {
        // There's horizontal space between rects
        if (rect1.x < rect2.x) {
            lineStart = { x: rect1.x + rect1.width + offset, y: rect1.y + rect1.height / 2 };
            lineEnd = { x: rect2.x - offset, y: rect2.y + rect2.height / 2 };
        } else {
            lineStart = { x: rect2.x + rect2.width + offset, y: rect2.y + rect2.height / 2 };
            lineEnd = { x: rect1.x - offset, y: rect1.y + rect1.height / 2 };
        }
    } else {
        // No horizontal space, connect the bottom edge of the top rect to the top edge of the bottom rect
        if (rect1.y < rect2.y) {
            lineStart = { x: rect1.x + rect1.width / 2, y: rect1.y + rect1.height + offset };
            lineEnd = { x: rect2.x + rect2.width / 2, y: rect2.y - offset };
        } else {
            lineStart = { x: rect2.x + rect2.width / 2, y: rect2.y + rect2.height + offset };
            lineEnd = { x: rect1.x + rect1.width / 2, y: rect1.y - offset };
        }
    }

    return { lineStart, lineEnd };

  }

    //
    //
    //
    //
    //

    // Function to subtract two vectors
function subtractVectors(v1, v2) {
  return v1.map((element, i) => element - v2[i]);
}

// Function to calculate the dot product of two vectors
function dotProduct(v1, v2) {
  return v1.reduce((sum, current, i) => sum + current * v2[i], 0);
}

// Function to calculate the magnitude of a vector
function magnitude(v) {
  return Math.sqrt(dotProduct(v, v));
}

// Function to normalize a vector
function normalize(v) {
  const mag = magnitude(v);
  return v.map(element => element / mag);
}

// Function to project a point onto the axis defined by two points (v1 and v2)
export function projectPointOntoLine(point, v1, v2) {
  const lineDirection = subtractVectors(v2, v1);
  const normalizedDirection = normalize(lineDirection);
  const vectorToPoint = subtractVectors(point, v1);
  return dotProduct(vectorToPoint, normalizedDirection);
}

//
//
//
//
//

export function findBiggestOutlier(points, distanceFunctionName) {

  let outlierIndex, zScore;
  const n = points.length;

  if (n < 3) {
    
    outlierIndex = null;
    zScore = 0;

  } else {

    const dimensions = points[0].length; // all points have same dimensionality
    let centroid = new Array(dimensions).fill(0);
    let distances = new Array(n).fill(0);

    points.forEach(point => {
        point.forEach((value, i) => {
            centroid[i] += value / n;
        });
    });

    const distanceFunction = distanceFunctionName === 'cosine' ? cosineDistance : euclideanDistance;

    let meanDistance = 0;
    points.forEach((point, index) => {
        const distance = distanceFunction(centroid, point);
        distances[index] = distance;
        meanDistance += distance / n;
    });

    let variance = distances.reduce((acc, val) => acc + Math.pow(val - meanDistance, 2), 0) / (n - 1);
    let stdDev = Math.sqrt(variance);

    let maxDistance = Math.max(...distances);
    outlierIndex = distances.indexOf(maxDistance);
    zScore = (maxDistance - meanDistance) / stdDev;

  }
  return { outlierIndex, zScore };
}

//
//
//
//
//

export function findShortestPath(graph, startNode, endNode) {
  const distances = new Map();
  const previous = new Map();
  const queue = [];

  // Initialize distances and queue
  graph.forEach((value, key) => {
      distances.set(key, Infinity);
      queue.push({node: key, priority: Infinity});
  });

  distances.set(startNode, 0);
  queue.push({node: startNode, priority: 0});

  while (queue.length > 0) {
      // Sort queue by priority and take the node with the smallest distance
      queue.sort((a, b) => a.priority - b.priority);
      const { node } = queue.shift();

      // Early exit if we found the target node
      if (node === endNode) break;

      // Relaxation step
      const neighbors = graph.get(node).connections;
      neighbors.forEach(({node: neighbor, weight}) => {
          let alt = distances.get(node) + weight;
          if (alt < distances.get(neighbor)) {
              distances.set(neighbor, alt);
              previous.set(neighbor, node);
              queue.push({node: neighbor, priority: alt});
          }
      });
  }

  // Reconstruct the path
  const path = [];
  let current = endNode;

  while (previous.has(current)) {
      path.unshift(current);
      current = previous.get(current);
  }

  path.unshift(startNode);
  if (path.length === 0 || path[0] !== startNode) return null; 
  
  return path; 
}




