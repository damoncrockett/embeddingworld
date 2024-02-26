import { PCA } from 'ml-pca';
import { UMAP } from 'umap-js';

export function reduceEmbeddings(mapList, basemapLocked, reducer) {
    if (mapList.length === 0) return [];

    const toFit = basemapLocked ? mapList.filter(d => d.lvl === 'b') : mapList;

    if (toFit.length === 1) return [[0, 0]]; // PCA can't really handle single points

    let coords = [];
    if (reducer === 'pca') {
        
        const pca = new PCA(toFit.map(d => Array.from(d.vec)), { center: true, nComponents: 2 });
        coords = pca.predict(mapList.map(d => d.vec))['data'];

    } else if (reducer === 'umap') {
        
        const umap = new UMAP({
            nNeighbors: 15,
            DistanceFn: 'cosine',
            minDist: 0.1,
        });

        // Identify indices of points to fit and transform separately
        const fitIndices = toFit.map(d => mapList.indexOf(d));
        const transformIndices = mapList.map((_, index) => index).filter(index => !fitIndices.includes(index));

        // Fit the model on the selected points
        // Note that `fit` is really `fit_transform`, so we can't run transform on these points, or 
        // else we are really transforming twice
        const fittedCoords = umap.fit(toFit.map(d => d.vec));

        if (!basemapLocked) {
            // If basemap is not locked, fittedCoords are already in the correct order for the fitted points
            coords = fittedCoords;
        } else {
            // Prepare an array to hold all coordinates in the original order
            coords = new Array(mapList.length);

            // Place fitted coordinates in their original positions
            fitIndices.forEach((index, fitIndex) => {
                coords[index] = fittedCoords[fitIndex];
            });

            // Transform the remaining points and place them back in their original positions
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
