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
  sources?: number[];
};

type DocumentData = {
  id: string;
  name: string;
  type: "PDF" | "TXT" | "TEXT";
  size: number;
  pageCount: number | null;
  characterCount: number;
  wordCount: number;
  chunkCount: number;
  preview: string;
  text: string;
};

type Analysis = {
  summary: string;
  keywords: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
};

type ChatApiResponse = {
  success?: boolean;
  answer?: string;
  error?: string;
  sources?: Array<{
    chunkIndex: number;
    relevanceScore: number;
  }>;
};

const initialAssistantMessage: ChatMessage = {
  role: "assistant",
  content:
    "Upload a PDF or TXT file, or paste text below. I will index it into RAG chunks so you can ask document-based questions.",
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisError, setAnalysisError] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([
    initialAssistantMessage,
  ]);

  function clearPreviousResults() {
    setDocumentData(null);
    setAnalysis(null);
    setError("");
    setAnalysisError("");
    setMessage("");
    setMessages([initialAssistantMessage]);
  }

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);
    setPastedText("");
    clearPreviousResults();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    },
  });

  const hasInput = Boolean(selectedFile) || pastedText.trim().length > 0;
  const isWorking = isProcessing || isAnalyzing;

  async function requestAnalysis(text: string) {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to analyze the document.");
    }

    return result.analysis as Analysis;
  }

  async function handleAnalyze() {
    if (!hasInput || isWorking) {
      return;
    }

    setIsProcessing(true);
    setError("");
    setAnalysis(null);
    setAnalysisError("");
    setMessages([initialAssistantMessage]);

    try {
      const formData = new FormData();

      if (selectedFile) {
        formData.append("file", selectedFile);
      } else {
        formData.append("text", pastedText.trim());
      }

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadResult.error || "Document processing failed.");
      }

      const processedDocument = uploadResult.document as DocumentData;

      setDocumentData(processedDocument);

      setMessages([
        {
          role: "assistant",
          content: `I processed "${processedDocument.name}". It contains ${processedDocument.wordCount} words, ${processedDocument.characterCount} characters, and was indexed into ${processedDocument.chunkCount} RAG chunks. I am generating AI insights now.`,
        },
      ]);

      setIsProcessing(false);
      setIsAnalyzing(true);

      try {
        const generatedAnalysis = await requestAnalysis(processedDocument.text);

        setAnalysis(generatedAnalysis);

        setMessages((currentMessages) => [
          ...currentMessages,
          {
            role: "assistant",
            content:
              "Document insights are ready. You can now ask questions using retrieved document sections.",
          },
        ]);
      } catch (analysisRequestError) {
        const errorMessage =
          analysisRequestError instanceof Error
            ? analysisRequestError.message
            : "Unable to generate AI insights.";

        setAnalysisError(errorMessage);

        setMessages((currentMessages) => [
          ...currentMessages,
          {
            role: "assistant",
            content:
              "The document was processed and RAG-indexed, but AI insights could not be generated. You can still ask document questions.",
          },
        ]);
      } finally {
        setIsAnalyzing(false);
      }
    } catch (uploadError) {
      const errorMessage =
        uploadError instanceof Error
          ? uploadError.message
          : "Something went wrong while processing the document.";

      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSendMessage() {
    const cleanMessage = message.trim();

    if (!cleanMessage || isChatLoading) {
      return;
    }

    if (!documentData) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content:
            "Please analyze a document first. Then I can retrieve relevant sections and answer your question.",
        },
      ]);

      setMessage("");
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "user",
        content: cleanMessage,
      },
    ]);

    setMessage("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: cleanMessage,
          documentId: documentData.id,
        }),
      });

      const result = (await response.json()) as ChatApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error || result.answer || "Unable to answer the question."
        );
      }

      if (!result.answer) {
        throw new Error("The RAG service did not return an answer.");
      }

   const answer = result.answer;

if (!answer) {
  throw new Error("The RAG service did not return an answer.");
}

const sourceNumbers =
  result.sources?.map((source) => source.chunkIndex) || [];

setMessages((currentMessages) => [
  ...currentMessages,
  {
    role: "assistant",
    content: answer,
    sources: sourceNumbers,
  },
]);
    } catch (chatError) {
      const errorMessage =
        chatError instanceof Error
          ? chatError.message
          : "Unable to answer the question. Please try again.";

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: `Sorry, I could not answer that question: ${errorMessage}`,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }

  const displayedFileName =
    documentData?.name || selectedFile?.name || "No file selected";

  const displayedFileType =
    documentData?.type ||
    (selectedFile
      ? selectedFile.name.split(".").pop()?.toUpperCase()
      : pastedText.trim()
        ? "TEXT"
        : "—");

  const displayedTextLength = documentData
    ? `${documentData.characterCount} characters`
    : pastedText.trim()
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
              <h1 className="text-lg font-semibold tracking-tight">
                DocIntel
              </h1>
              <p className="text-sm text-slate-500">
                Context-aware document assistant
              </p>
            </div>
          </div>

          <Badge variant="secondary" className="gap-1 px-3 py-1">
            <Bot className="size-3.5" />
            RAG workspace
          </Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[1.1fr_1.4fr_0.9fr]">
        <section>
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
                    clearPreviousResults();
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

              {analysisError ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Document indexed successfully, but AI insights failed:{" "}
                  {analysisError}
                </p>
              ) : null}

              <Button
                className="w-full"
                onClick={handleAnalyze}
                disabled={isWorking || !hasInput}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Processing and indexing...
                  </>
                ) : isAnalyzing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Generating insights...
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
                        <p className="whitespace-pre-wrap">
                          {chatMessage.content}
                        </p>

                        {chatMessage.role === "assistant" &&
                        chatMessage.sources &&
                        chatMessage.sources.length > 0 ? (
                          <p className="mt-2 text-xs font-medium text-indigo-600">
                            Retrieved chunks:{" "}
                            {chatMessage.sources.join(", ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {isChatLoading ? (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                        <Loader2 className="size-4 animate-spin" />
                        Retrieving relevant document sections...
                      </div>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !isChatLoading) {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask a question about your document..."
                    disabled={isChatLoading || !documentData}
                  />

                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={
                      isChatLoading || !message.trim() || !documentData
                    }
                    aria-label="Send message"
                  >
                    {isChatLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
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
                  {documentData && !isProcessing && !isAnalyzing ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <span className="size-2 rounded-full bg-amber-500" />
                  )}

                  <span className="text-sm font-medium text-slate-700">
                    {isProcessing
                      ? "Processing and indexing document"
                      : isAnalyzing
                        ? "Generating AI insights"
                        : documentData
                          ? "Document processed and RAG indexed"
                          : "Ready to analyze"}
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
                      {displayedFileName}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Format</dt>
                    <dd className="font-medium text-slate-700">
                      {displayedFileType}
                    </dd>
                  </div>

                  {documentData?.pageCount ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Pages</dt>
                      <dd className="font-medium text-slate-700">
                        {documentData.pageCount}
                      </dd>
                    </div>
                  ) : null}

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Words</dt>
                    <dd className="font-medium text-slate-700">
                      {documentData ? documentData.wordCount : "—"}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">RAG chunks</dt>
                    <dd className="font-medium text-slate-700">
                      {documentData ? documentData.chunkCount : "—"}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Text length</dt>
                    <dd className="font-medium text-slate-700">
                      {displayedTextLength}
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
                  {isAnalyzing ? (
                    <Badge variant="secondary" className="gap-1">
                      <Loader2 className="size-3 animate-spin" />
                      Analyzing...
                    </Badge>
                  ) : analysis && analysis.keywords.length > 0 ? (
                    analysis.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      {documentData
                        ? "No AI tags generated yet."
                        : "Upload a document to generate tags."}
                    </span>
                  )}
                </div>
              </div>

              {analysis ? (
                <>
                  <Separator />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      AI summary
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {analysis.summary}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Sentiment
                    </p>

                    <Badge variant="secondary" className="mt-3 capitalize">
                      {analysis.sentiment}
                    </Badge>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Action items
                    </p>

                    {analysis.actionItems.length > 0 ? (
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                        {analysis.actionItems.map((item, index) => (
                          <li
                            key={`${item}-${index}`}
                            className="flex gap-2"
                          >
                            <span className="text-indigo-600">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        No explicit action items found.
                      </p>
                    )}
                  </div>
                </>
              ) : null}

              <Separator />

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Text preview
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {documentData
                    ? `${documentData.preview}${
                        documentData.text.length > documentData.preview.length
                          ? "..."
                          : ""
                      }`
                    : "Upload a document to see an extracted-text preview here."}
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}