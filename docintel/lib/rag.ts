import { GoogleGenAI } from "@google/genai";

export type DocumentChunk = {
  id: string;
  documentId: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
};

export type RetrievedChunk = {
  chunkIndex: number;
  text: string;
  score: number;
};

const vectorStore = new Map<string, DocumentChunk[]>();

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;
const EMBEDDING_MODEL = "gemini-embedding-001";

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local and restart the development server."
    );
  }

  return new GoogleGenAI({ apiKey });
}

function splitLongText(text: string, maxLength: number) {
  const pieces: string[] = [];
  let remainingText = text.trim();

  while (remainingText.length > maxLength) {
    let splitAt = remainingText.lastIndexOf(" ", maxLength);

    if (splitAt < maxLength * 0.6) {
      splitAt = maxLength;
    }

    pieces.push(remainingText.slice(0, splitAt).trim());
    remainingText = remainingText.slice(splitAt).trim();
  }

  if (remainingText) {
    pieces.push(remainingText);
  }

  return pieces;
}

export function chunkDocument(text: string) {
  const cleanText = normalizeText(text);

  if (!cleanText) {
    return [];
  }

  const sentences =
    cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];

  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const cleanSentence = sentence.trim();

    if (!cleanSentence) {
      continue;
    }

    if (cleanSentence.length > CHUNK_SIZE) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      chunks.push(...splitLongText(cleanSentence, CHUNK_SIZE));
      continue;
    }

    const nextChunk = currentChunk
      ? `${currentChunk} ${cleanSentence}`
      : cleanSentence;

    if (nextChunk.length <= CHUNK_SIZE) {
      currentChunk = nextChunk;
      continue;
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());

      const overlap = currentChunk.slice(-CHUNK_OVERLAP).trim();

      currentChunk = overlap
        ? `${overlap} ${cleanSentence}`
        : cleanSentence;
    } else {
      currentChunk = cleanSentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length >= 40);
}

async function createEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
) {
  const ai = getGeminiClient();

  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: 768,
    },
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding || embedding.length === 0) {
    throw new Error("Gemini did not return an embedding vector.");
  }

  return embedding;
}

function cosineSimilarity(vectorA: number[], vectorB: number[]) {
  if (vectorA.length !== vectorB.length || vectorA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < vectorA.length; index += 1) {
    const valueA = vectorA[index];
    const valueB = vectorB[index];

    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export async function indexDocument(documentId: string, text: string) {
  const chunks = chunkDocument(text);

  if (chunks.length === 0) {
    throw new Error(
      "The document does not contain enough readable text for RAG indexing."
    );
  }

  const indexedChunks: DocumentChunk[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const embedding = await createEmbedding(
      chunks[index],
      "RETRIEVAL_DOCUMENT"
    );

    indexedChunks.push({
      id: `${documentId}-chunk-${index + 1}`,
      documentId,
      chunkIndex: index + 1,
      text: chunks[index],
      embedding,
    });
  }

  vectorStore.set(documentId, indexedChunks);

  return {
    chunkCount: indexedChunks.length,
  };
}

export async function retrieveRelevantChunks(
  documentId: string,
  question: string,
  topK = 3
) {
  const indexedChunks = vectorStore.get(documentId);

  if (!indexedChunks || indexedChunks.length === 0) {
    throw new Error(
      "This document is not indexed in memory. Please analyze the document again before asking a question."
    );
  }

  const questionEmbedding = await createEmbedding(
    question,
    "RETRIEVAL_QUERY"
  );

  const scoredChunks: RetrievedChunk[] = indexedChunks.map((chunk) => ({
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    score: cosineSimilarity(questionEmbedding, chunk.embedding),
  }));

  return scoredChunks
    .sort((first, second) => second.score - first.score)
    .slice(0, Math.min(topK, scoredChunks.length));
}