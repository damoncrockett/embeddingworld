import { pipeline } from '@xenova/transformers';

const embeddingModels = [
    'nomic-ai/nomic-embed-text-v1',
    'Xenova/all-MiniLM-L6-v2',
    'Xenova/bert-base-uncased',
    'Xenova/bge-m3',
    'Xenova/jina-embeddings-v2-small-en',
]

async function initializeEmbedder(embeddingModel, embedderRef, setVersion) {
    try {
        const newEmbedder = await pipeline('feature-extraction', embeddingModel);
        embedderRef.current = newEmbedder;
        setVersion(version => version + 1); // Increment the version to trigger processing
        console.log('incremented version');
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

