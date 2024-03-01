import { PCA } from 'ml-pca';
import { UMAP } from 'umap-js';
import { projectPointOntoLine } from './geometry';

export function reduceEmbeddings(mapList, basemapLocked, reducer, maxPairCoords) {
    if (mapList.length === 0) return [];

    const toFit = basemapLocked ? mapList.filter(d => d.lvl === 'b') : mapList;

    if (toFit.length === 1) return [[0, 0]]; // PCA can't really handle single points

    let coords = [];
    if (reducer === 'pca') {
        
        const pca = new PCA(toFit.map(d => Array.from(d.vec)), { center: true });
        coords = pca.predict(mapList.map(d => d.vec), { nComponents: 2 } )['data'];

    } else if (reducer === 'umap') {

        // 15 neigbors if we have at least 45 points, otherwise 5
        // If we have less than 15 points, we can't run UMAP
        const nNeighbors = toFit.length >= 45 ? 15 : toFit.length >= 15 ? 5 : 0;
        
        const umap = new UMAP({
            nNeighbors: nNeighbors,
            DistanceFn: 'cosine',
            minDist: 0.1,
        });

        const fitIndices = toFit.map(d => mapList.indexOf(d));
        const transformIndices = mapList.map((_, index) => index).filter(index => !fitIndices.includes(index));

        // Note that `fit` is really `fit_transform`, so can't run transform on these pts, or else we are transforming twice
        const fittedCoords = umap.fit(toFit.map(d => d.vec));

        if (!basemapLocked) {
            coords = fittedCoords;
        } else {
            coords = new Array(mapList.length);

            fitIndices.forEach((index, fitIndex) => {
                coords[index] = fittedCoords[fitIndex];
            });

            if (transformIndices.length > 0) {
                const transformCoords = umap.transform(transformIndices.map(index => mapList[index].vec));
                transformIndices.forEach((index, transIndex) => {
                    coords[index] = transformCoords[transIndex];
                });
            }
        }
    } else if (reducer === 'proj') {
        
        if (mapList.length === 1) return [[0, 0]];       

        const projected = mapList.map(d => projectPointOntoLine(d.vec, maxPairCoords[0], maxPairCoords[1]))
        coords = projected.map(d => [d, 0])

        }

    return coords;
}
