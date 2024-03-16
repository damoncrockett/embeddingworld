import { pipeline } from '@xenova/transformers';
import { set } from 'lodash';

const embeddingModels = [
    'nomic-ai/nomic-embed-text-v1',
    'Xenova/all-MiniLM-L6-v2',
    'Xenova/bert-base-uncased',
    'Xenova/bge-m3',
    'mixedbread-ai/mxbai-embed-large-v1',
    'Xenova/jina-embeddings-v2-small-en'
    
]

async function initializeEmbedder(
    embeddingModel, 
    embedderRef, 
    setEmbedderChangeCounter,
    setLoading,
    setLoadingInset) {
    try {
        const newEmbedder = await pipeline('feature-extraction', embeddingModel);
        embedderRef.current = newEmbedder;
        setEmbedderChangeCounter(counter => counter + 1);
        setLoading(false);
        setLoadingInset(false);
    } catch (error) {
        console.error("Error initializing embedder:", error);
    }
}

async function getEmbeddings(sampleList, embedderRef) {
    const embedder = embedderRef.current;
    const embeddings = await Promise.all(
        sampleList.map(async sample => {
            const embedding = await embedder(sample, { pooling: 'mean', normalize: true });
            return embedding["data"];
        })
    );
    return embeddings;
}

export { embeddingModels, initializeEmbedder, getEmbeddings };

