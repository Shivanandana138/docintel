import { NextResponse } from "next/server";
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

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
      if (uploadedFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: "File is too large. Upload a file smaller than 5 MB.",
          },
          { status: 413 }
        );
      }

      name = uploadedFile.name;
      size = uploadedFile.size;

      if (isTextFile(uploadedFile)) {
        rawText = await uploadedFile.text();
        type = "TXT";
      } else if (isPdfFile(uploadedFile)) {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const parser = new PDFParse({ data: buffer });
        const pdfResult = await parser.getText();

        rawText = pdfResult.text;
        pageCount = pdfResult.total;

        await parser.destroy();

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
        {
          error: "Upload a PDF/TXT file or paste text before analyzing.",
        },
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

    return NextResponse.json({
      success: true,
      document: {
        id: crypto.randomUUID(),
        name,
        type,
        size,
        pageCount,
        characterCount: text.length,
        wordCount: countWords(text),
        preview: text.slice(0, 400),
        text,
      },
    });
  } catch (error) {
    console.error("Document upload error:", error);

    return NextResponse.json(
      {
        error:
          "Unable to process the document. Make sure the file is not damaged and try again.",
      },
      { status: 500 }
    );
  }
}