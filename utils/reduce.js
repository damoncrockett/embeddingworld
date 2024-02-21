import { PCA } from 'ml-pca';
import { toScreenCoordinates } from './coords';

export function reduceEmbeddings(mapList, width, height, basemapLocked) {

    const toFit = basemapLocked ? mapList.filter(d => d.lvl === 'b') : mapList;
    const twoDimArrays = toFit.map(d => Array.from(d.vec));
    const model = new PCA(twoDimArrays);
    const coords = model.predict(mapList.map(d => d.vec))["data"].map(d => Array.from(d.slice(0, 2)));
    const screenCoords = toScreenCoordinates(coords, width, height, 100);

    return screenCoords;
}
