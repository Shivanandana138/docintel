"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Bot,
  CheckCircle2,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};
type DocumentData = {
  id: string;
  name: string;
  type: string;
  size: number;
  characterCount: number;
  wordCount: number;
  preview: string;
  text: string;
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Upload a PDF or text file, or paste text below. Then ask me questions about the document.",
    },
  ]);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (file) {
      setSelectedFile(file);
      setPastedText("");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
  });

  const hasDocument = Boolean(selectedFile) || pastedText.trim().length > 0;
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyze() {
  const hasInput = Boolean(selectedFile) || pastedText.trim().length > 0;

  if (!hasInput) {
    return;
  }

  setIsAnalyzing(true);
  setError("");

  try {
    const formData = new FormData();

    if (selectedFile) {
      formData.append("file", selectedFile);
    } else {
      formData.append("text", pastedText.trim());
    }

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Document processing failed.");
    }

    setDocumentData(result.document);

    setMessages([
      {
        role: "assistant",
        content: `I processed "${result.document.name}". It contains ${result.document.wordCount} words and ${result.document.characterCount} characters. You can now ask questions about it.`,
      },
    ]);
  } catch (uploadError) {
    const errorMessage =
      uploadError instanceof Error
        ? uploadError.message
        : "Something went wrong while processing the document.";

    setError(errorMessage);
  } finally {
    setIsAnalyzing(false);
  }
}

  function handleSendMessage() {
    const cleanMessage = message.trim();

    if (!cleanMessage) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "user",
        content: cleanMessage,
      },
      {
        role: "assistant",
        content:
          "This is a demo response. In the RAG phase, DocIntel will retrieve relevant text from your document before answering.",
      },
    ]);

    setMessage("");
  }

  const documentFormat = selectedFile
    ? selectedFile.name.split(".").pop()?.toUpperCase()
    : pastedText.trim()
      ? "TEXT"
      : "—";

  const documentLength = pastedText.trim()
    ? `${pastedText.trim().length} characters`
    : "—";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Sparkles className="size-5" />
            </div>

            <div>
              <h1 className="text-lg font-semibold tracking-tight">DocIntel</h1>
              <p className="text-sm text-slate-500">
                Context-aware document assistant
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="gap-1 px-3 py-1">
            <Bot className="size-3.5" />
            AI workspace
          </Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.1fr_1.4fr_0.9fr]">
        <section className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UploadCloud className="size-5 text-indigo-600" />
                Add a document
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
                  isDragActive
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50"
                }`}
              >
                <input {...getInputProps()} />

                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <FolderOpen className="size-6 text-indigo-600" />
                </div>

                {selectedFile ? (
                  <>
                    <p className="font-medium text-slate-900">
                      {selectedFile.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB selected
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-slate-900">
                      Drop a PDF or TXT file here
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Or click to browse from your computer
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Or
                </span>
                <Separator className="flex-1" />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="document-text"
                  className="text-sm font-medium text-slate-700"
                >
                  Paste document text
                </label>

                <Textarea
                  id="document-text"
                  value={pastedText}
                  onChange={(event) => {
                    setPastedText(event.target.value);
                    setSelectedFile(null);
                  }}
                  placeholder="Paste meeting notes, a report, an article, or another text document..."
                  className="min-h-36 resize-none"
                />
              </div>
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              <Button
                className="w-full"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !hasDocument}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Preparing document...
                  </>
                ) : (
                  <>
                    <FileText className="size-4" />
                    Analyze document
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                Accepted formats: PDF and TXT
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="flex min-h-[620px] flex-col border-slate-200 shadow-sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquareText className="size-5 text-indigo-600" />
                Ask DocIntel
              </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col p-0">
              <ScrollArea className="flex-1 px-5 py-5">
                <div className="space-y-4">
                  {messages.map((chatMessage, index) => (
                    <div
                      key={`${chatMessage.role}-${index}`}
                      className={
                        chatMessage.role === "user"
                          ? "flex justify-end"
                          : "flex justify-start"
                      }
                    >
                      <div
                        className={
                          chatMessage.role === "user"
                            ? "max-w-[85%] rounded-2xl bg-slate-900 px-4 py-3 text-sm leading-6 text-white"
                            : "max-w-[85%] rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-700"
                        }
                      >
                        {chatMessage.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask a question about your document..."
                  />

                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    aria-label="Send message"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <aside>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Document insights</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </p>

                <div className="mt-2 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium text-slate-700">
                    {hasDocument ? "Ready to analyze" : "Waiting for document"}
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Metadata
                </p>

                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">File</dt>
                    <dd className="max-w-40 truncate font-medium text-slate-700">
                      {selectedFile?.name || "No file selected"}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Format</dt>
                    <dd className="font-medium text-slate-700">
                      {documentFormat}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Text length</dt>
                    <dd className="font-medium text-slate-700">
                      {documentLength}
                    </dd>
                  </div>
                </dl>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Suggested tags
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">Summary</Badge>
                  <Badge variant="secondary">Keywords</Badge>
                  <Badge variant="secondary">Action items</Badge>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  AI summary
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Upload a document to generate a concise summary, key themes,
                  important facts, and actionable follow-ups.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}