import { PCA } from 'ml-pca';
import { UMAP } from 'umap-js';
import { toScreenCoordinates } from './coords';

export function reduceEmbeddings(mapList, width, height, basemapLocked, reducer) {

    if (mapList.length === 0) return [];

    const toFit = basemapLocked ? mapList.filter(d => d.lvl === 'b') : mapList;
    
    let screenCoords;
    if (reducer === 'pca') {
      const twoDimArrays = toFit.map(d => Array.from(d.vec));
      const pca = new PCA(twoDimArrays);
      const coords = pca.predict(mapList.map(d => d.vec))["data"].map(d => Array.from(d.slice(0, 2)));
      
      screenCoords = toScreenCoordinates(coords, width, height, 100);

    } else if (reducer === 'umap') {
      
      const nNeighbors = toFit.length > 15 ? 15 : toFit.length - 1;
      
      const umap = new UMAP({ nNeighbors: nNeighbors});
      umap.fit(toFit.map(d => d.vec))
      const coords = umap.transform(mapList.map(d => d.vec));
        
      screenCoords = toScreenCoordinates(coords, width, height, 100);

    }

    return screenCoords;
}