import { pipeline } from "@xenova/transformers";
import { set } from "lodash";

const embeddingModels = [
  "Xenova/jina-embeddings-v2-small-en",
  "Xenova/all-MiniLM-L6-v2",
  "Xenova/bge-small-en-v1.5",
  "Supabase/gte-small",
  "nomic-ai/nomic-embed-text-v1.5",
  "mixedbread-ai/mxbai-embed-large-v1",
];

async function initializeEmbedder(
  embeddingModel,
  embedderRef,
  setEmbedderChangeCounter,
  setLoading,
  setLoadingInset,
  webGPU,
) {
  try {
    const newEmbedder = await pipeline("feature-extraction", embeddingModel, {
      device: webGPU ? "webgpu" : null,
      dtype: webGPU ? "fp32" : "q8",
    });
    embedderRef.current = newEmbedder;
    setEmbedderChangeCounter((counter) => counter + 1);
    setLoading(false);
    setLoadingInset(false);
  } catch (error) {
    console.error("Error initializing embedder:", error);
  }
}

async function getEmbeddings(sampleList, embedderRef) {
  const embedder = embedderRef.current;
  const embeddings = await Promise.all(
    sampleList.map(async (sample) => {
      const embedding = await embedder(sample, {
        pooling: "mean",
        normalize: true,
      });
      return embedding["data"];
    }),
  );
  return embeddings;
}

export { embeddingModels, initializeEmbedder, getEmbeddings };
