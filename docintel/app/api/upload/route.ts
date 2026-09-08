import { NextResponse } from "next/server";
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import { indexDocument } from "@/lib/rag";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function countWords(text: string) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return 0;
  }

  return normalizedText.split(/\s+/).length;
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isTextFile(file: File) {
  return (
    file.type === "text/plain" ||
    file.name.toLowerCase().endsWith(".txt")
  );
}

async function extractPdfText(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();

    return {
      text: result.text,
      pageCount: result.total || null,
    };
  } finally {
    await parser.destroy();
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const uploadedFile = formData.get("file");
    const pastedText = formData.get("text");

    let rawText = "";
    let name = "Pasted text";
    let type = "TEXT";
    let size = 0;
    let pageCount: number | null = null;

    if (uploadedFile instanceof File) {
      if (uploadedFile.size === 0) {
        return NextResponse.json(
          { error: "The selected file is empty." },
          { status: 400 }
        );
      }

      if (uploadedFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "File is too large. Upload a file smaller than 5 MB." },
          { status: 413 }
        );
      }

      name = uploadedFile.name;
      size = uploadedFile.size;

      if (isTextFile(uploadedFile)) {
        rawText = await uploadedFile.text();
        type = "TXT";
      } else if (isPdfFile(uploadedFile)) {
        const pdfDocument = await extractPdfText(uploadedFile);

        rawText = pdfDocument.text;
        pageCount = pdfDocument.pageCount;
        type = "PDF";
      } else {
        return NextResponse.json(
          {
            error:
              "Unsupported file type. Please upload a PDF file or a TXT file.",
          },
          { status: 415 }
        );
      }
    } else if (typeof pastedText === "string" && pastedText.trim()) {
      rawText = pastedText.trim();
      name = "Pasted text";
      type = "TEXT";
      size = new Blob([rawText]).size;
    } else {
      return NextResponse.json(
        { error: "Upload a PDF/TXT file or paste text before analyzing." },
        { status: 400 }
      );
    }

    const text = rawText.replace(/\s+/g, " ").trim();

    if (!text) {
      const error =
        type === "PDF"
          ? "No readable text was found in this PDF. It may be scanned and require OCR."
          : "The document does not contain readable text.";

      return NextResponse.json({ error }, { status: 400 });
    }

    const documentId = crypto.randomUUID();

    const indexingResult = await indexDocument(documentId, text);

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        name,
        type,
        size,
        pageCount,
        characterCount: text.length,
        wordCount: countWords(text),
        chunkCount: indexingResult.chunkCount,
        preview: text.slice(0, 700),
        text,
      },
    });
  } catch (error) {
    console.error("Document upload/indexing error:", error);

    const detailedMessage =
      error instanceof Error
        ? error.message
        : "Unknown document-processing error.";

    return NextResponse.json(
      {
        error: `Unable to process and index the document: ${detailedMessage}`,
      },
      { status: 500 }
    );
  }
}