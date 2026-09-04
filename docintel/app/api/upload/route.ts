import { NextResponse } from "next/server";
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function getFileType(fileName: string, mimeType: string) {
  const normalizedFileName = fileName.toLowerCase();

  if (
    mimeType === "application/pdf" ||
    normalizedFileName.endsWith(".pdf")
  ) {
    return "PDF";
  }

  if (
    mimeType === "text/plain" ||
    normalizedFileName.endsWith(".txt")
  ) {
    return "TXT";
  }

  return "UNKNOWN";
}

function createDocumentResponse(
  name: string,
  type: "PDF" | "TXT" | "TEXT",
  size: number,
  text: string,
  pageCount: number | null
) {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const previewLength = 700;
  const preview = cleanText.slice(0, previewLength);
  const wordCount = cleanText ? cleanText.split(/\s+/).length : 0;

  return {
    id: crypto.randomUUID(),
    name,
    type,
    size,
    pageCount,
    characterCount: cleanText.length,
    wordCount,
    preview,
    text: cleanText,
  };
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

      const fileType = getFileType(uploadedFile.name, uploadedFile.type);

      if (fileType === "UNKNOWN") {
        return NextResponse.json(
          { error: "Only PDF and TXT files are supported." },
          { status: 415 }
        );
      }

      if (fileType === "TXT") {
        const text = await uploadedFile.text();

        if (!text.trim()) {
          return NextResponse.json(
            { error: "The TXT file does not contain readable text." },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          document: createDocumentResponse(
            uploadedFile.name,
            "TXT",
            uploadedFile.size,
            text,
            null
          ),
        });
      }

      const pdfDocument = await extractPdfText(uploadedFile);

      if (!pdfDocument.text.trim()) {
        return NextResponse.json(
          {
            error:
              "No readable text was found in this PDF. It may be a scanned image PDF and require OCR.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        document: createDocumentResponse(
          uploadedFile.name,
          "PDF",
          uploadedFile.size,
          pdfDocument.text,
          pdfDocument.pageCount
        ),
      });
    }

    if (typeof pastedText === "string" && pastedText.trim()) {
      const text = pastedText.trim();

      return NextResponse.json({
        success: true,
        document: createDocumentResponse(
          "Pasted document text",
          "TEXT",
          new Blob([text]).size,
          text,
          null
        ),
      });
    }

    return NextResponse.json(
      { error: "Upload a PDF/TXT file or paste document text first." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Document upload error:", error);

    return NextResponse.json(
      {
        error:
          "Unable to process the document. Please try another PDF, TXT file, or pasted text.",
      },
      { status: 500 }
    );
  }
}