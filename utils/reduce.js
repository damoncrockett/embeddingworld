import { PCA } from 'ml-pca';
import { projectPointOntoLine } from './geometry';

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

            if (selections[2] && selections[3]) {
                const selectionVecs = mapList.filter(d => d.smp === selections[2] || d.smp === selections[3]).map(d => d.vec);

                if (selectionVecs.length !== 2) return mapList.map(d => [Math.random() * 2 - 1, Math.random() * 2 - 1]); // need better fix

                const projectedY = mapList.map(d => projectPointOntoLine(d.vec, selectionVecs[0], selectionVecs[1]))
                
                coords = projectedX.map((d, i) => [d, projectedY[i]]);

            } else {

                coords = projectedX.map(d => [d, 0])
            }
        } else {
            
            coords = mapList.map(d => [Math.random() * 2 - 1, Math.random() * 2 - 1]);
        }
    } else {
        coords = mapList.map(d => [Math.random() * 2 - 1, Math.random() * 2 - 1]);
    }

    return coords;
}
