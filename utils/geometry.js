function euclideanDistance(arr1, arr2) {
    return Math.sqrt(arr1.reduce((sum, current, index) => sum + Math.pow(current - arr2[index], 2), 0));
}

function cosineDistance(arrA, arrB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < arrA.length; i++) {
      dotProduct += arrA[i] * arrB[i]; // Sum of product of each corresponding elements
      normA += arrA[i] * arrA[i]; // Sum of squares of elements in arrA
      normB += arrB[i] * arrB[i]; // Sum of squares of elements in arrB
    }
  
    normA = Math.sqrt(normA); // Square root of sum of squares of arrA
    normB = Math.sqrt(normB); // Square root of sum of squares of arrB
  
    const cosineSimilarity = dotProduct / (normA * normB);
    const cosineDistance = 1 - cosineSimilarity; // Convert similarity to distance
  
    return cosineDistance;
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

export function computeAndRankPairwiseDistances(arrays, distanceFunctionName) {
    const pairs = generatePairwiseComparisons(arrays.length);

    const distanceFunction = distanceFunctionName === 'cosine' ? cosineDistance : euclideanDistance;

    const distances = pairs.map(pair => ({
        pair,
        distance: distanceFunction(arrays[pair[0]], arrays[pair[1]])
    }));

    // Sort distances to rank them, maintaining original pair order in the output
    const sortedDistances = [...distances].sort((a, b) => a.distance - b.distance);
    const maxDistance = sortedDistances[sortedDistances.length - 1].distance;
    const maxPair = sortedDistances[sortedDistances.length - 1].pair;
    const ranks = new Array(distances.length);

    // Assign ranks based on sorted positions
    sortedDistances.forEach((sortedDistance, index) => {
        const originalIndex = distances.findIndex(d => d.pair[0] === sortedDistance.pair[0] && d.pair[1] === sortedDistance.pair[1]);
        ranks[originalIndex] = index + 1;
    });

    return [ranks, maxDistance, maxPair];
}

//
//
//
//
//

function getRanks(arr) {
    // Create an array of [value, originalIndex] pairs
    const arrWithIndex = arr.map((value, index) => [value, index]);
    // Sort the array by the values
    arrWithIndex.sort((a, b) => a[0] - b[0]);
  
    // Create a new array for ranks, fill it with zeros initially
    const ranks = new Array(arr.length).fill(0);
    let sumRank = 0, count = 1;
  
    for (let i = 0; i < arrWithIndex.length; i++) {
      // Add current index to sumRank and increment count
      sumRank += i + 1; // +1 because ranks start from 1
  
      // Check if we're at the end of the array or if the next value is different
      if (i === arrWithIndex.length - 1 || arrWithIndex[i][0] !== arrWithIndex[i + 1][0]) {
        // If at the end or next value is different, assign the average rank to all equal values
        const avgRank = sumRank / count;
        for (let j = i - count + 1; j <= i; j++) {
          ranks[arrWithIndex[j][1]] = avgRank;
        }
        // Reset sumRank and count for the next set of values
        sumRank = 0;
        count = 1;
      } else {
        // If the next value is the same, increment count and continue
        count++;
      }
    }
  
    return ranks;
  }
  
  export function spearmanRankCorrelation(arrX, arrY) {
    if (arrX.length !== arrY.length) {
      throw new Error("Arrays must be of the same length");
    }
  
    const rankX = getRanks(arrX);
    const rankY = getRanks(arrY);
  
    const dSquared = rankX.map((rx, i) => Math.pow(rx - rankY[i], 2));
    const sumDSquared = dSquared.reduce((acc, curr) => acc + curr, 0);
    const n = arrX.length;
  
    return 1 - (6 * sumDSquared) / (n * (Math.pow(n, 2) - 1));
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


