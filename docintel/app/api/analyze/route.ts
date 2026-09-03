import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Analysis = {
  summary: string;
  keywords: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
};

function safelyParseAnalysis(content: string): Analysis | null {
  try {
    const parsed = JSON.parse(content) as Analysis;

    if (
      typeof parsed.summary !== "string" ||
      !Array.isArray(parsed.keywords) ||
      !Array.isArray(parsed.actionItems) ||
      !["positive", "neutral", "negative", "mixed"].includes(
        parsed.sentiment
      )
    ) {
      return null;
    }

    return {
      summary: parsed.summary,
      keywords: parsed.keywords
        .filter((keyword) => typeof keyword === "string")
        .slice(0, 6),
      actionItems: parsed.actionItems
        .filter((item) => typeof item === "string")
        .slice(0, 5),
      sentiment: parsed.sentiment,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is missing. Add it to .env.local and restart the development server.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        {
          error: "Document text is required for analysis.",
        },
        { status: 400 }
      );
    }

    const textForAnalysis = text.slice(0, 18000);

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `You are DocIntel, a precise document-analysis assistant.

Analyze only the document content provided by the user.
Do not invent facts that are absent from the document.

Return valid JSON only, with this exact shape:
{
  "summary": "A concise 2-4 sentence summary",
  "keywords": ["keyword one", "keyword two"],
  "actionItems": ["action item one", "action item two"],
  "sentiment": "positive" | "neutral" | "negative" | "mixed"
}

Rules:
- Provide 3 to 6 concise keyword/topic tags.
- Provide 0 to 5 action items. If none are stated or reasonably implied, return an empty array.
- Use "neutral" for factual documents with no clear emotion.
- Keep the summary concise and grounded in the document.`,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Document content:\n\n${textForAnalysis}`,
            },
          ],
        },
      ],
    });

    const analysis = safelyParseAnalysis(response.output_text);

    if (!analysis) {
      return NextResponse.json(
        {
          error:
            "The AI returned an unexpected response format. Please try analyzing the document again.",
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

    return NextResponse.json(
      {
        error: "Unable to analyze the document right now. Please try again.",
      },
      { status: 500 }
    );
  }
}