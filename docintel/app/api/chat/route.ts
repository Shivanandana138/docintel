import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { retrieveRelevantChunks } from "@/lib/rag";

export const runtime = "nodejs";

type ChatRequest = {
  question?: unknown;
  documentId?: unknown;
};

const CHAT_MODELS = [
  process.env.GEMINI_CHAT_MODEL || "gemini-3.6-flash",
  "gemini-3.6-flash-lite",
];

function isRetryableGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /\b(429|500|502|503|504)\b|UNAVAILABLE|overloaded|high demand/i.test(
    message
  );
}

function isUnavailableModelError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /\b404\b|NOT_FOUND|no longer available|model.*not found/i.test(
    message
  );
}

async function generateChatAnswer(ai: GoogleGenAI, prompt: string) {
  let lastError: unknown;

  for (const model of CHAT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.2,
          },
        });
      } catch (error) {
        lastError = error;

        if (!isRetryableGeminiError(error) && !isUnavailableModelError(error)) {
          throw error;
        }

        if (isUnavailableModelError(error)) {
          break;
        }

        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY is missing. Add it to .env.local and restart the development server.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ChatRequest;

    const question =
      typeof body.question === "string" ? body.question.trim() : "";

    const documentId =
      typeof body.documentId === "string" ? body.documentId.trim() : "";

    if (!question) {
      return NextResponse.json(
        { error: "A question is required." },
        { status: 400 }
      );
    }

    if (!documentId) {
      return NextResponse.json(
        {
          error:
            "A document ID is required. Analyze a document before asking questions.",
        },
        { status: 400 }
      );
    }

    const retrievedChunks = await retrieveRelevantChunks(
      documentId,
      question,
      3
    );

    const retrievedContext = retrievedChunks
      .map(
        (chunk) =>
          `[Retrieved document chunk ${chunk.chunkIndex}]

${chunk.text}`
      )
      .join("\n\n---\n\n");

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are DocIntel, a Retrieval-Augmented Generation document assistant.

Answer the user's question using ONLY the retrieved document chunks supplied below.

Rules:
- Do not use outside knowledge.
- Do not invent facts, formulas, or assumptions.
- If the retrieved chunks do not contain the answer, say exactly:
"I could not find that information in the retrieved document sections."
- Keep answers concise, clear, and useful.
- For broad requests such as "give the formulas" or "list formulas", group formulas by topic.
- For broad formula requests, include at most 12 key formulas unless the user explicitly asks for every formula.
- Use simple plain-text math where possible, for example: Area = pi × r².
- Do not add a "Sources:" line.
- Do not mention chunk numbers in your answer.
- The application will show the actual retrieved chunks separately.

Retrieved document chunks:
${retrievedContext}

User question:
${question}`;

    const response = await generateChatAnswer(ai, prompt);

    const answer = response.text?.trim() || "";

    if (!answer) {
      return NextResponse.json(
        { error: "Gemini did not return an answer. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      answer,
      sources: retrievedChunks.map((chunk) => ({
        chunkIndex: chunk.chunkIndex,
        relevanceScore: Number(chunk.score.toFixed(3)),
      })),
    });
  } catch (error) {
    console.error("RAG chat error:", error);

    const detailedMessage =
      error instanceof Error ? error.message : "Unknown RAG chat error.";

    const isTemporaryProviderError = isRetryableGeminiError(error);

    return NextResponse.json(
      {
        error: isTemporaryProviderError
          ? "The AI service is temporarily busy. Please try your question again in a moment."
          : `Unable to answer from document retrieval: ${detailedMessage}`,
      },
      { status: isTemporaryProviderError ? 503 : 500 }
    );
  }
}