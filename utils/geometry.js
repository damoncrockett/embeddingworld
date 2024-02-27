// export function scaleCoords(coords) {
//     const numPoints = coords.length;
//     const dim = coords[0].length;
//     const mins = new Array(dim).fill(Infinity);
//     const maxs = new Array(dim).fill(-Infinity);

//     // Find min and max for each dimension
//     for (let i = 0; i < numPoints; i++) {
//         for (let j = 0; j < dim; j++) {
//             mins[j] = Math.min(mins[j], coords[i][j]);
//             maxs[j] = Math.max(maxs[j], coords[i][j]);
//         }
//     }

//     // Scale points to the [0, 1] range
//     const scaledCoords = coords.map(point =>
//         point.map((value, idx) => {
//             const range = maxs[idx] - mins[idx];
//             return range === 0 ? 0 : (value - mins[idx]) / range; // Avoid division by zero
//         })
//     );

//     return scaledCoords;

// }

// function distanceSquared(pointA, pointB) {
//     let distance = 0;
//     for (let i = 0; i < pointA.length; i++) {
//         distance += (pointA[i] - pointB[i]) ** 2;
//     }
//     return distance;
// }

// function findFurthestPoint(points, fromPoint) {
//     let maxDistance = -Infinity;
//     let furthestPoint = null;
//     for (let point of points) {
//         let dist = distanceSquared(point, fromPoint);
//         if (dist > maxDistance) {
//             maxDistance = dist;
//             furthestPoint = point;
//         }
//     }
//     return furthestPoint;
// }

// function calculateSphere(points) {
//     if (points.length === 0) return null;
//     if (points.length === 1) return { center: points[0], radius: 0 };

//     // Step 1: Pick an arbitrary point x from P, find furthest point y
//     let x = points[0];
//     let y = findFurthestPoint(points, x);

//     // Step 2: Find furthest point z from y
//     let z = findFurthestPoint(points, y);

//     // Step 3: Set up initial ball B with centre as midpoint of y and z, radius as half distance between y and z
//     let center = y.map((yi, i) => (yi + z[i]) / 2);
//     let radiusSquared = distanceSquared(y, z) / 4;
//     let radius = Math.sqrt(radiusSquared);

//     // Step 4: Check if all points are within ball B, if not, adjust the ball
//     for (let p of points) {
//         let distSquaredToP = distanceSquared(center, p);
//         if (distSquaredToP > radiusSquared) {
//             // Point p is outside the sphere, adjust the sphere to include p
//             let distToP = Math.sqrt(distSquaredToP);
//             let newRadius = (radius + distToP) / 2;
//             let radiusIncrease = newRadius - radius;
//             radiusSquared = newRadius ** 2;

//             // Move the center towards p
//             for (let i = 0; i < center.length; i++) {
//                 let direction = (p[i] - center[i]) / distToP; // Normalize direction vector
//                 center[i] += direction * radiusIncrease;
//             }
//             radius = newRadius;
//         }
//     }

//     return { center: center, radius: radius };
// }

//
//
//
//
//

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
    const ranks = new Array(distances.length);

    // Assign ranks based on sorted positions
    sortedDistances.forEach((sortedDistance, index) => {
        const originalIndex = distances.findIndex(d => d.pair[0] === sortedDistance.pair[0] && d.pair[1] === sortedDistance.pair[1]);
        ranks[originalIndex] = index + 1;
    });

    return [ranks, maxDistance];
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