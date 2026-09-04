import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

type ChatRequest = {
  question?: unknown;
  documentText?: unknown;
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

    const documentText =
      typeof body.documentText === "string"
        ? body.documentText.trim()
        : "";

    if (!question) {
      return NextResponse.json(
        { error: "A question is required." },
        { status: 400 }
      );
    }

    if (!documentText) {
      return NextResponse.json(
        { error: "Document text is required." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const documentContext = documentText.slice(0, 16000);

    const prompt = `You are DocIntel, a document question-answering assistant.

Answer ONLY from the supplied document content.

Rules:
- Do not use outside knowledge.
- Do not invent facts or assumptions.
- If the answer is not found in the document, say exactly:
"I could not find that information in the document."
- Keep the answer concise, direct, and useful.
- Quote a short phrase from the document when useful as evidence.

Document content:
${documentContext}

Question:
${question}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
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
    });
  } catch (error) {
    console.error("Document chat error:", error);

    const detailedMessage =
      error instanceof Error ? error.message : "Unknown Gemini error.";

    return NextResponse.json(
      {
        error: `Gemini chat failed: ${detailedMessage}`,
      },
      { status: 500 }
    );
  }
}