# DocIntel

DocIntel is a document intelligence workspace for uploading or pasting text, generating AI insights, and asking questions grounded in the document content.

## Current Status

The current MVP includes:

- PDF and TXT uploads, plus pasted text input
- PDF text extraction with a 5 MB upload limit
- Document chunking with 200-character overlap
- Gemini embeddings for document indexing and query retrieval
- In-memory vector search using cosine similarity
- Gemini-generated summaries, keywords, action items, and sentiment
- Retrieval-Augmented Generation (RAG) chat with up to three relevant document chunks
- Retry and model-fallback handling for temporary Gemini failures
- User-facing processing, analysis, retrieval, and error states

## Tech Stack

- Next.js 16 with the App Router
- React 19 and TypeScript
- Tailwind CSS 4
- Google Gemini via `@google/genai`
- `pdf-parse` for PDF text extraction
- `react-dropzone` for file uploads
- Lucide React and shadcn-style UI components

## Getting Started

### Prerequisites

- Node.js 20 or newer
- A Google Gemini API key with access to embedding and generative models

### Installation

```bash
npm install
```

Create `.env.local` in this directory:

```env
GEMINI_API_KEY=your_gemini_api_key
# Optional override for the chat model
# GEMINI_CHAT_MODEL=gemini-3.6-flash
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev      # Start the development server
npm run lint     # Run ESLint
npm run build    # Create a production build
npm run start    # Start the production server
```

## How It Works

1. Upload a PDF/TXT file or paste document text.
2. The upload route extracts and normalizes the text, then creates overlapping chunks.
3. Gemini creates an embedding for each chunk, which is stored in an in-memory vector store for the document session.
4. The analysis route sends the document text to Gemini and validates the structured JSON response.
5. A chat question is embedded, matched against the stored chunks, and answered by Gemini using only the retrieved context.

## Current Limitations

- Documents and embeddings are stored only in server memory and are lost when the server restarts or the process changes.
- The application is currently intended for a single active document workflow; there is no database, authentication, or document history.
- Scanned PDFs without an embedded text layer are not OCR-processed.
- Analysis sends at most the first 16,000 characters to Gemini.
- Production deployment needs a persistent vector store, request/authentication controls, and operational monitoring.

## Project Structure

```text
app/page.tsx             Main upload, insights, and chat interface
app/api/upload/route.ts  File parsing, text normalization, and indexing
app/api/analyze/route.ts Gemini document analysis endpoint
app/api/chat/route.ts    Retrieval-grounded chat endpoint
lib/rag.ts               Chunking, embeddings, vector storage, and retrieval
components/ui/           Shared UI primitives
```
