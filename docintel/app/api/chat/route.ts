import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { retrieveRelevantChunks } from "@/lib/rag";

export const runtime = "nodejs";

type ChatRequest = {
  question?: unknown;
  documentId?: unknown;
};

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

    const context = retrievedChunks
      .map(
        (chunk) =>
          `[Source chunk ${chunk.chunkIndex} | relevance score: ${chunk.score.toFixed(
            3
          )}]

${chunk.text}`
      )
      .join("\n\n---\n\n");

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are DocIntel, a Retrieval-Augmented Generation document assistant.

Answer the user's question using ONLY the retrieved document chunks below.

Rules:
- Do not use outside knowledge.
- Do not invent facts.
- If the retrieved chunks do not contain the answer, say exactly:
"I could not find that information in the retrieved document sections."
- Keep the answer concise and useful.
- End every answer with a separate line in this exact format:
Sources: 1, 2
- Use only the source chunk numbers that support your answer.

Retrieved document chunks:
${context}

Question:
${question}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

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

    return NextResponse.json(
      {
        error: `Unable to answer from document retrieval: ${detailedMessage}`,
      },
      { status: 500 }
    );
  }
}