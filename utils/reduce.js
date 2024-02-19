import { getEmbeddings } from './embed';
import { PCA } from 'ml-pca';
import { toScreenCoordinates } from './coords';

export async function reduceEmbeddings(
    sampleList, 
    width, 
    height, 
    embedderRef, 
    setEmbeddings, 
    embeddings = null, 
    fittedModel = null) {

    let newEmbeddings = await getEmbeddings(sampleList, embedderRef);

    const mergedEmbeddings = embeddings ? [...embeddings, ...newEmbeddings] : newEmbeddings;
    setEmbeddings(mergedEmbeddings);

    const twoDimArrays = mergedEmbeddings.map(d => Array.from(d));

    const model = fittedModel ? fittedModel : new PCA(twoDimArrays);
    const coords = model.predict(twoDimArrays)["data"].map(d => Array.from(d.slice(0, 2)));
    const screenCoords = toScreenCoordinates(coords, width, height, 100);

    return { model, screenCoords };
}
