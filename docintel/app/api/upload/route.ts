import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function countWords(text: string) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return 0;
  }

  return normalizedText.split(/\s+/).length;
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

    if (uploadedFile instanceof File) {
      if (uploadedFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: "File is too large. Upload a file smaller than 5 MB.",
          },
          { status: 413 }
        );
      }

      const isTxtFile =
        uploadedFile.type === "text/plain" ||
        uploadedFile.name.toLowerCase().endsWith(".txt");

      if (!isTxtFile) {
        return NextResponse.json(
          {
            error:
              "Only TXT files are supported right now. PDF support is the next milestone.",
          },
          { status: 415 }
        );
      }

      rawText = await uploadedFile.text();
      name = uploadedFile.name;
      type = "TXT";
      size = uploadedFile.size;
    } else if (typeof pastedText === "string" && pastedText.trim()) {
      rawText = pastedText.trim();
      name = "Pasted text";
      type = "TEXT";
      size = new Blob([rawText]).size;
    } else {
      return NextResponse.json(
        {
          error: "Upload a TXT file or paste text before analyzing.",
        },
        { status: 400 }
      );
    }

    const text = rawText.replace(/\s+/g, " ").trim();

    if (!text) {
      return NextResponse.json(
        {
          error: "The document does not contain readable text.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        id: crypto.randomUUID(),
        name,
        type,
        size,
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
        error: "Unable to process the document. Please try again.",
      },
      { status: 500 }
    );
  }
}