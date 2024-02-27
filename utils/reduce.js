import { PCA } from 'ml-pca';
import { UMAP } from 'umap-js';

export function reduceEmbeddings(mapList, basemapLocked, reducer) {
    if (mapList.length === 0) return [];

    const toFit = basemapLocked ? mapList.filter(d => d.lvl === 'b') : mapList;

    if (toFit.length === 1) return [[0, 0]]; // PCA can't really handle single points

    let coords = [];
    if (reducer === 'pca') {
        
        const pca = new PCA(toFit.map(d => Array.from(d.vec)), { center: true });
        coords = pca.predict(mapList.map(d => d.vec), { nComponents: 2 } )['data'];

    } else if (reducer === 'umap') {
        
        const umap = new UMAP({
            nNeighbors: 15,
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
    }

    return coords;
}
