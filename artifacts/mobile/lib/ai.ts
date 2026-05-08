import { fetch as expoFetch } from "expo/fetch";

import type { QuizQuestion } from "@/contexts/AppContext";

const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
const API_BASE = DOMAIN ? `https://${DOMAIN}/api` : "/api";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

async function callApi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {}
    throw new Error(`API ${path} failed (${res.status}) ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export type RagHistoryItem = { role: "user" | "assistant"; content: string };

export type RagParams = {
  question: string;
  documentTitle: string;
  documentNotes?: string;
  retrievedChunks?: string[];
  documentText?: string;
  history?: RagHistoryItem[];
};

export async function ragAnswer(params: RagParams): Promise<string> {
  const { answer } = await callApi<{ answer: string }>("/ai/rag", params);
  return answer || "I couldn't generate a response. Please try again.";
}

export async function extractPdfChunks(pdfBase64: string): Promise<{
  pages: number;
  chunks: string[];
  truncated: boolean;
  chunkCount: number;
}> {
  const { pages, chunks, truncated, chunkCount } = await callApi<{
    pages: number;
    chunks: string[];
    truncated: boolean;
    chunkCount: number;
  }>("/ai/extract-pdf", { pdfBase64 });
  return {
    pages,
    chunks: Array.isArray(chunks) ? chunks : [],
    truncated,
    chunkCount: chunkCount ?? 0,
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function bm25Retrieve(
  chunks: string[],
  query: string,
  k = 5,
): string[] {
  if (!chunks.length) return [];

  const K1 = 1.5;
  const B = 0.75;

  const tokenizedChunks = chunks.map(tokenize);
  const avgdl =
    tokenizedChunks.reduce((s, t) => s + t.length, 0) / tokenizedChunks.length;
  const N = chunks.length;

  const queryTerms = [...new Set(tokenize(query))];

  const idf: Record<string, number> = {};
  for (const term of queryTerms) {
    const df = tokenizedChunks.filter((c) => c.includes(term)).length;
    idf[term] = Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }

  const scored = chunks.map((chunk, i) => {
    const tokens = tokenizedChunks[i]!;
    const dl = tokens.length;
    const tf: Record<string, number> = {};
    for (const t of tokens) tf[t] = (tf[t] ?? 0) + 1;

    let score = 0;
    for (const term of queryTerms) {
      const f = tf[term] ?? 0;
      if (f === 0) continue;
      score +=
        (idf[term] ?? 0) *
        ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (dl / avgdl))));
    }
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k).map((s) => s.chunk);
}

export async function ragAnswerStream(
  params: RagParams,
  onToken: (delta: string, full: string) => void,
): Promise<string> {
  const res = await expoFetch(`${API_BASE}/ai/rag/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(params),
  });
  if (!res.ok || !res.body) {
    throw new Error(`rag stream failed (${res.status})`);
  }

  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIdx: number;
      while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);

        for (const line of rawEvent.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload) as {
              content?: string;
              done?: boolean;
              error?: string;
            };
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              full += parsed.content;
              onToken(parsed.content, full);
            }
          } catch (e) {
            if (e instanceof Error && e.message) throw e;
          }
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {}
  }

  return full || "I couldn't generate a response. Please try again.";
}

export type MainsScores = {
  structure: number;
  content: number;
  relevance: number;
  presentation: number;
  valueAddition: number;
};

export type MainsResult = {
  scores: MainsScores;
  totalScore: number;
  maxScore: number;
  feedback: string[];
  modelAnswerHint: string;
};

const RUBRIC_TO_KEY: Record<string, keyof MainsScores> = {
  Structure: "structure",
  Content: "content",
  Relevance: "relevance",
  Presentation: "presentation",
  "Value Addition": "valueAddition",
};

export async function evaluateMains(params: {
  question: string;
  paper: string;
  imageBase64: string;
  mimeType?: string;
}): Promise<MainsResult> {
  const { evaluation } = await callApi<{
    evaluation: {
      totalScore?: number;
      band?: string;
      rubric?: { name: string; score: number; comment: string }[];
      strengths?: string[];
      improvements?: string[];
      rankerInsight?: string;
      modelIntro?: string;
    };
  }>("/ai/evaluate", params);

  const scores: MainsScores = {
    structure: 0,
    content: 0,
    relevance: 0,
    presentation: 0,
    valueAddition: 0,
  };
  const comments: Record<keyof MainsScores, string> = {
    structure: "",
    content: "",
    relevance: "",
    presentation: "",
    valueAddition: "",
  };

  if (Array.isArray(evaluation.rubric)) {
    for (const r of evaluation.rubric) {
      const key = RUBRIC_TO_KEY[r.name];
      if (key) {
        scores[key] = Math.max(0, Math.min(10, Number(r.score) || 0));
        comments[key] = r.comment || "";
      }
    }
  }

  const isEssay = params.paper === "Essay";
  const maxScore = isEssay ? 125 : 15;
  const sumOf10 =
    scores.structure +
    scores.content +
    scores.relevance +
    scores.presentation +
    scores.valueAddition;
  const apiTotal = Number(evaluation.totalScore);
  const total = Number.isFinite(apiTotal)
    ? Math.round((apiTotal / 50) * maxScore * 10) / 10
    : Math.round((sumOf10 / 50) * maxScore * 10) / 10;

  const feedback: string[] = [];
  if (evaluation.band) feedback.push(`Examiner band: ${evaluation.band}.`);
  for (const k of Object.keys(comments) as (keyof MainsScores)[]) {
    if (comments[k]) feedback.push(`${labelOf(k)} — ${comments[k]}`);
  }
  if (Array.isArray(evaluation.strengths))
    for (const s of evaluation.strengths) feedback.push(`Strength: ${s}`);
  if (Array.isArray(evaluation.improvements))
    for (const s of evaluation.improvements) feedback.push(`Improve: ${s}`);

  const modelAnswerHint = [evaluation.rankerInsight, evaluation.modelIntro]
    .filter(Boolean)
    .join("\n\n");

  return {
    scores,
    totalScore: total,
    maxScore,
    feedback: feedback.length
      ? feedback
      : ["The model returned no detailed feedback. Try a clearer photo of the answer."],
    modelAnswerHint:
      modelAnswerHint || "Open with a vignette, weave 3 dimensions, close with a forward path.",
  };
}

function labelOf(k: keyof MainsScores): string {
  switch (k) {
    case "structure":
      return "Structure";
    case "content":
      return "Content";
    case "relevance":
      return "Relevance";
    case "presentation":
      return "Presentation";
    case "valueAddition":
      return "Value Addition";
  }
}

export function sampleChunksForQuiz(
  chunks: string[],
  maxChars = 7_000,
): string[] {
  if (!chunks.length) return [];
  const N = chunks.length;
  const k = Math.min(10, N);
  const sampled: string[] = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.round((i / Math.max(k - 1, 1)) * (N - 1));
    const chunk = chunks[Math.min(idx, N - 1)];
    if (chunk && !sampled.includes(chunk)) sampled.push(chunk);
  }
  const result: string[] = [];
  let used = 0;
  for (const chunk of sampled) {
    if (used + chunk.length > maxChars) break;
    result.push(chunk);
    used += chunk.length;
  }
  return result;
}

export async function generateQuiz(
  topic: string,
  count: number,
  opts?: { documentTitle?: string; documentChunks?: string[] },
): Promise<QuizQuestion[]> {
  const body: Record<string, unknown> = { topic, count };
  if (opts?.documentTitle && opts.documentChunks?.length) {
    body.documentTitle = opts.documentTitle;
    body.documentPassages = sampleChunksForQuiz(opts.documentChunks);
  }
  const { questions } = await callApi<{
    questions: {
      id?: string;
      question?: string;
      options?: string[];
      correctIndex?: number;
      explanation?: string;
      topic?: string;
    }[];
  }>("/ai/quiz", body);

  return (questions ?? [])
    .filter(
      (q) =>
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        typeof q.correctIndex === "number",
    )
    .map((q) => ({
      id: q.id || uid(),
      prompt: q.question!,
      options: q.options!,
      correctIndex: Math.max(0, Math.min(3, q.correctIndex!)),
      explanation: q.explanation || "",
      subtopic: typeof q.topic === "string" ? q.topic : undefined,
    }));
}

export function pickRandomTopic() {
  const topics = [
    "Polity — Fundamental Rights",
    "History — Modern India",
    "Geography — Climatology",
    "Economy — Monetary Policy",
    "Environment — Climate Change",
  ];
  return topics[Math.floor(Math.random() * topics.length)]!;
}

export function randomFactCount() {
  return Math.floor(Math.random() * 180) + 40;
}
