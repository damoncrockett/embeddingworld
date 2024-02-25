import { PCA } from 'ml-pca';

export function reduceEmbeddings(mapList, basemapLocked) {

    if (mapList.length === 0) return [];

    const toFit = basemapLocked ? mapList.filter(d => d.lvl === 'b') : mapList;
    if ( toFit.length === 1 ) return [[0, 0]]; // PCA can't really handle single points

    const pca = new PCA(toFit.map(d => Array.from(d.vec)));
    const coords = pca.predict(mapList.map(d => d.vec))["data"].map(d => Array.from(d.slice(0, 2)));

    return coords;
}