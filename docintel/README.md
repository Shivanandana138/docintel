# DocIntel

DocIntel is a context-aware document assistant and insight extraction dashboard.

Users can upload documents, paste text, chat with their content using AI, and view structured insights such as document metadata, summaries, keywords, action items, and sentiment.

> This project is being built step by step as a learning-focused full-stack AI application.

## Project Goals

DocIntel aims to make long documents easier to understand by providing:

- Document upload through drag and drop
- Support for TXT files and pasted text
- PDF text extraction support
- AI-powered document chat
- Retrieval-Augmented Generation (RAG)
- Streaming AI answers
- Automatic summaries and key insights
- Keyword and topic tags
- Action-item extraction
- Sentiment analysis
- A clean SaaS-style dashboard UI

## Current Progress

| Feature | Status |
|---|---|
| GitHub repository setup | Complete |
| Next.js application setup | Complete |
| TypeScript and Tailwind CSS | Complete |
| Shadcn UI with Nova preset | Complete |
| Drag-and-drop upload interface | Complete |
| Pasted-text input interface | Complete |
| Chat interface prototype | Complete |
| Analytics sidebar prototype | Complete |
| Real TXT upload API | In progress |
| PDF parsing | Planned |
| Document embeddings | Planned |
| Vector database | Planned |
| RAG chat | Planned |
| Streaming AI responses | Planned |
| Automated analytics | Planned |
| Vercel deployment | Planned |

## Tech Stack

| Area | Technology |
|---|---|
| Framework | Next.js with App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI components | Shadcn UI with Radix UI |
| Icons | Lucide React |
| File upload | React Dropzone |
| Backend API | Next.js Route Handlers |
| Document parsing | TXT initially, PDF planned |
| AI provider | OpenAI API or compatible LLM API |
| RAG and embeddings | Planned |
| Vector database | Chroma, Pinecone, or similar |
| Deployment | Vercel |

## Project Structure

```text
docintel/
├── README.md                     # Main project documentation
├── .git/                         # Git version-control metadata
└── docintel/                     # Next.js application
    ├── app/
    │   ├── globals.css           # Global styles and Tailwind theme
    │   ├── layout.tsx            # Shared application layout
    │   └── page.tsx              # Main DocIntel dashboard page
    ├── components/
    │   └── ui/                   # Shadcn UI components
    ├── lib/
    │   └── utils.ts              # Shared utility functions
    ├── public/                   # Static assets
    ├── package.json              # Dependencies and npm scripts
    └── tsconfig.json             # TypeScript configuration
```

## Getting Started

### Prerequisites

Install the following before running the project:

- Node.js 20 or later
- npm
- Git
- Visual Studio Code, recommended

### Clone the repository

```bash
git clone https://github.com/Shivanandana138/docintel.git
cd docintel/docintel
```

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

Open the local application in your browser:

```text
http://localhost:3000
```

### Build for production

```bash
npm run build
```

## How DocIntel Will Work

```text
User uploads a document or pastes text
                ↓
Next.js frontend sends document data to API
                ↓
Backend validates and extracts document text
                ↓
Text is split into smaller chunks
                ↓
Embeddings convert chunks into vectors
                ↓
Vectors are stored in a vector database
                ↓
User asks a question
                ↓
Relevant document chunks are retrieved
                ↓
LLM generates an answer using document context
                ↓
Answer streams into the chat interface
                ↓
Dashboard displays summary, tags, and action items
```

## Development Roadmap

### Phase 1: Foundation

- [x] Create GitHub repository
- [x] Create Next.js project
- [x] Configure TypeScript and Tailwind CSS
- [x] Initialize Shadcn UI
- [x] Build the initial DocIntel dashboard

### Phase 2: Document Upload and Parsing

- [ ] Create a document upload API route
- [ ] Process pasted text on the backend
- [ ] Process TXT file uploads
- [ ] Validate file types and maximum file size
- [ ] Extract text from PDF documents
- [ ] Display document metadata and preview

### Phase 3: RAG Pipeline

- [ ] Split document text into chunks
- [ ] Generate embeddings for each chunk
- [ ] Store embeddings in a vector database
- [ ] Retrieve relevant chunks for each user question
- [ ] Create context-aware document answers

### Phase 4: AI Chat

- [ ] Connect an LLM API
- [ ] Create an AI chat endpoint
- [ ] Stream AI responses to the user interface
- [ ] Add source citations from document chunks
- [ ] Handle chat errors and loading states

### Phase 5: Analytics

- [ ] Generate document summaries
- [ ] Extract keywords and themes
- [ ] Extract action items
- [ ] Estimate document sentiment
- [ ] Display analytics in the insights sidebar

### Phase 6: Production

- [ ] Add environment-variable configuration
- [ ] Improve file-storage handling
- [ ] Add document persistence/database support
- [ ] Test error handling and edge cases
- [ ] Deploy to Vercel
- [ ] Add a demo video or screenshots

## Learning Concepts

This project is designed to teach practical full-stack AI development concepts:

| Concept | Why It Matters in DocIntel |
|---|---|
| Git and GitHub | Tracks every milestone and creates a portfolio-ready project history |
| Next.js | Provides both frontend pages and backend API routes |
| React state | Updates the interface when files, messages, and API responses change |
| FormData | Sends files and pasted text from the browser to the backend |
| API routes | Process documents securely on the server |
| Text extraction | Converts files into text AI systems can understand |
| Embeddings | Represent meaning numerically for semantic document search |
| Vector search | Finds the most relevant document sections for a question |
| RAG | Grounds AI answers in the uploaded document rather than guessing |
| Streaming | Shows generated AI text progressively for a responsive chat experience |

## Notes

- The current dashboard is a frontend prototype.
- Real document parsing, RAG, and AI responses will be added incrementally.
- API keys must never be committed to GitHub.
- Environment variables will be stored in a `.env.local` file once an LLM provider is connected.

## Author

Built by [Shivananda](https://github.com/Shivanandana138) as a full-stack AI learning project.