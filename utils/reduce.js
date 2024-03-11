import { PCA } from 'ml-pca';
import { projectPointOntoLine } from './geometry';

export function reduceEmbeddings(mapList, basemapLocked, reducer, maxPairCoords) {
    if (mapList.length === 0) return [];

    const toFit = basemapLocked ? mapList.filter(d => d.lvl === 'b') : mapList;

    if (toFit.length === 1) return [[0, 0]]; // PCA can't really handle single points

    let coords = [];
    if (reducer === 'pca') {
        
        const pca = new PCA(toFit.map(d => Array.from(d.vec)), { center: true });
        coords = pca.predict(mapList.map(d => d.vec), { nComponents: 2 } )['data'];

    } else if (reducer === 'project') {
        
        if (mapList.length === 1) return [[0, 0]];       

        const projected = mapList.map(d => projectPointOntoLine(d.vec, maxPairCoords[0], maxPairCoords[1]))
        coords = projected.map(d => [d, 0])
    } else {
        // coords are random between -1 and 1
        coords = mapList.map(d => [Math.random() * 2 - 1, Math.random() * 2 - 1]);
    }

    return coords;
}
