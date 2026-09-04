import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

type AnalyzeRequest = {
  text?: unknown;
};

type Sentiment = "positive" | "neutral" | "negative" | "mixed";

type DocumentAnalysis = {
  summary: string;
  keywords: string[];
  actionItems: string[];
  sentiment: Sentiment;
};

const allowedSentiments: Sentiment[] = [
  "positive",
  "neutral",
  "negative",
  "mixed",
];

function extractJson(text: string) {
  const cleanedText = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleanedText.indexOf("{");
  const lastBrace = cleanedText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Gemini did not return a JSON object.");
  }

  return cleanedText.slice(firstBrace, lastBrace + 1);
}

function isDocumentAnalysis(value: unknown): value is DocumentAnalysis {
  if (!value || typeof value !== "object") {
    return false;
  }

  const analysis = value as Record<string, unknown>;

  return (
    typeof analysis.summary === "string" &&
    Array.isArray(analysis.keywords) &&
    analysis.keywords.every((item) => typeof item === "string") &&
    Array.isArray(analysis.actionItems) &&
    analysis.actionItems.every((item) => typeof item === "string") &&
    typeof analysis.sentiment === "string" &&
    allowedSentiments.includes(analysis.sentiment as Sentiment)
  );
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

    const body = (await request.json()) as AnalyzeRequest;
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        { error: "Document text is required for analysis." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const documentContext = text.slice(0, 16000);

    const prompt = `You are DocIntel, an accurate document-analysis assistant.

Analyze ONLY the document content below. Do not use outside knowledge. Do not invent facts.

Return ONLY valid JSON. Do not use Markdown or code fences.

Return exactly this JSON shape:
{
  "summary": "A concise 2-4 sentence summary.",
  "keywords": ["up to 6 short keyword phrases"],
  "actionItems": ["explicit action item 1"],
  "sentiment": "positive" | "neutral" | "negative" | "mixed"
}

Rules:
- If there are no explicit action items, return an empty array.
- Use "neutral" for factual, technical, informational, or academic text unless another sentiment is clear.
- If the text has little meaningful content, say that in summary and keep both arrays empty.

Document content:
${documentContext}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const rawOutput = response.text?.trim() || "";

    if (!rawOutput) {
      return NextResponse.json(
        { error: "Gemini did not return analysis content. Please try again." },
        { status: 502 }
      );
    }

    const analysis = JSON.parse(extractJson(rawOutput)) as unknown;

    if (!isDocumentAnalysis(analysis)) {
      return NextResponse.json(
        {
          error:
            "Gemini returned incomplete analysis data. Please try again.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Document analysis error:", error);

    const detailedMessage =
      error instanceof Error ? error.message : "Unknown Gemini error.";

    return NextResponse.json(
      {
        error: `Gemini analysis failed: ${detailedMessage}`,
      },
      { status: 500 }
    );
  }
}