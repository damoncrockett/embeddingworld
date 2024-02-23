import { PCA } from 'ml-pca';
import { UMAP } from 'umap-js';

export function reduceEmbeddings(mapList, basemapLocked, reducer) {

    if (mapList.length === 0) return [];

    const toFit = basemapLocked ? mapList.filter(d => d.lvl === 'b') : mapList;

    let coords;
    if (reducer === 'pca') {

      const twoDimArrays = toFit.map(d => Array.from(d.vec));
      const pca = new PCA(twoDimArrays);
      coords = pca.predict(mapList.map(d => d.vec))["data"].map(d => Array.from(d.slice(0, 2)));
      
    } else if (reducer === 'umap') {

      const umap = new UMAP({ nNeighbors: 5});
      umap.fit(toFit.map(d => d.vec))
      coords = umap.transform(mapList.map(d => d.vec));

      } 

    return coords;
}