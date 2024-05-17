import { PCA } from 'ml-pca';
import { projectPointOntoLine, euclideanDistance, cosineDistance, angleBetweenVectors, polarToCartesian } from './geometry';

export function reduceEmbeddings(mapList, basemapLocked, reducer, selections) {
    if (mapList.length === 0) return [];

    const toFit = basemapLocked ? mapList.filter(d => d.lvl === 'b') : mapList;

    if (toFit.length === 1) return [[0, 0]]; // PCA can't really handle single points

    let coords = [];
    if (reducer === 'pca') {
        
        const pca = new PCA(toFit.map(d => Array.from(d.vec)), { center: true });
        coords = pca.predict(mapList.map(d => d.vec), { nComponents: 2 } )['data'];

    } else if (reducer === 'project') {
        
        if (mapList.length === 1) return [[0, 0]];       

        if (selections[0] && selections[1]) {
            const selectionVecs = mapList.filter(d => d.smp === selections[0] || d.smp === selections[1]).map(d => d.vec);
            
            if (selectionVecs.length !== 2) return mapList.map(d => [Math.random() * 2 - 1, Math.random() * 2 - 1]); // need better fix

            const projectedX = mapList.map(d => projectPointOntoLine(d.vec, selectionVecs[0], selectionVecs[1]))
            const projectedXranks = projectedX.map(d => projectedX.filter(e => e < d).length);

            if (selections[2] && selections[3]) {
                const selectionVecs = mapList.filter(d => d.smp === selections[2] || d.smp === selections[3]).map(d => d.vec);

                if (selectionVecs.length !== 2) return mapList.map(d => [Math.random() * 2 - 1, Math.random() * 2 - 1]); // need better fix

                const projectedY = mapList.map(d => projectPointOntoLine(d.vec, selectionVecs[0], selectionVecs[1]))
                const projectedYranks = projectedY.map(d => projectedY.filter(e => e < d).length);
                
                //coords = projectedX.map((d, i) => [d, projectedY[i]]);
                coords = projectedXranks.map((d, i) => [d, projectedYranks[i]]);

            } else {

                //coords = projectedX.map(d => [d, 0])
                coords = projectedXranks.map(d => [d, 0]);
            }
        } else {
            
            coords = mapList.map(d => [Math.random() * 2 - 1, Math.random() * 2 - 1]);
        }
    } else if (reducer === 'nearest') {

        if (selections[0]) {

            const selectionVec = mapList.find(d => d.smp === selections[0]).vec;

            if (!selectionVec) return mapList.map(d => [Math.random() * 2 - 1, Math.random() * 2 - 1]); // need better fix

            const euclideanDistances = mapList.map(d => euclideanDistance(d.vec, selectionVec));

            let adjustedEuclideanDistances;
            //adjustedEuclideanDistances = euclideanDistances.map(d => Math.log(d + 0.001));
            //adjustedEuclideanDistances = euclideanDistances.map(d => (d - Math.min(...euclideanDistances)) / Math.max(...euclideanDistances));
            adjustedEuclideanDistances = euclideanDistances.map(d => euclideanDistances.filter(e => e < d).length);
            const anglesBetween = mapList.map(d => angleBetweenVectors(d.vec, selectionVec));
            coords = adjustedEuclideanDistances.map((d, i) => polarToCartesian(d, anglesBetween[i]));

            console.log(adjustedEuclideanDistances, anglesBetween, coords);

        } else {
            coords = mapList.map(d => [Math.random() * 2 - 1, Math.random() * 2 - 1]);
        }
        
    } else {

        const pca = new PCA(toFit.map(d => Array.from(d.vec)), { center: true });
        coords = pca.predict(mapList.map(d => d.vec), { nComponents: 2 } )['data'];

        const threshold = 0.15;
        const graph = new Map();

        mapList.forEach((item, index) => {
            
            graph.set(index, { connections: [], smp: item.smp });
            
            mapList.forEach((otherItem, otherIndex) => {
                if (index !== otherIndex) {
                    const dist = cosineDistance(item.vec, otherItem.vec);
                    if (dist < threshold) { 
                        graph.get(index).connections.push({ node: otherIndex, weight: Number(dist.toFixed(3)) });
                    }
                }
            });
        });

        return { graph, coords };

    }

    return coords;
}
