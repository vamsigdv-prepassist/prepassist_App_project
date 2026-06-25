import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { extractText, getDocumentProxy } from "unpdf";

const router: IRouter = Router();
const MODEL = "gpt-5.4";

// ── Helpers ─────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

async function structureIntoNotes(rawText: string, source: string): Promise<string> {
  const capped = rawText.length > 400_000 ? rawText.slice(0, 400_000) : rawText;
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 8_000,
    messages: [
      {
        role: "system",
        content: [
          "You are an elite UPSC exam preparation mentor.",
          "Your job: convert raw study material into clean, structured Markdown notes.",
          "Format with # Headers, ## Sub-headers, bullet points (- ), **Bold** key terms.",
          "Retain all important facts, dates, statistics, and constitutional articles.",
          "Do NOT hallucinate content. Output Markdown only — no preamble.",
        ].join("\n"),
      },
      {
        role: "user",
        content: `Source: ${source}\n\nRaw content:\n${capped}`,
      },
    ],
  });
  return response.choices[0]?.message?.content?.trim() ?? rawText.slice(0, 3000);
}

// ── POST /ai/notes/extract-ocr ───────────────────────────────────────────────
// Accepts { base64Image: "data:image/...;base64,..." } and returns { text }
router.post("/notes/extract-ocr", async (req, res) => {
  try {
    const { base64Image } = req.body ?? {};
    if (typeof base64Image !== "string" || !base64Image) {
      res.status(400).json({ error: "base64Image is required" });
      return;
    }

    req.log?.info("notes/extract-ocr: running vision OCR");

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 4_000,
      messages: [
        {
          role: "system",
          content: [
            "You are an expert at reading handwritten UPSC study notes.",
            "Extract ALL handwritten text from the image faithfully.",
            "Format the output as clean Markdown: use headers, bullets, and bold for key terms.",
            "Ignore crossed-out text. Preserve the logical structure of the notes.",
            "Output Markdown only — no preamble or explanation.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: base64Image, detail: "high" },
            },
            {
              type: "text",
              text: "Extract and format all handwritten text from this image into clean Markdown study notes.",
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    req.log?.info({ chars: text.length }, "notes/extract-ocr: done");
    res.json({ text });
  } catch (err) {
    req.log?.error({ err }, "notes/extract-ocr failed");
    res.status(500).json({ error: "ocr_failed" });
  }
});

// ── POST /ai/notes/extract-pdf ───────────────────────────────────────────────
// Accepts { pdfBase64 } and returns { text, title }
router.post("/notes/extract-pdf", async (req, res) => {
  try {
    const { pdfBase64 } = req.body ?? {};
    if (typeof pdfBase64 !== "string" || !pdfBase64) {
      res.status(400).json({ error: "pdfBase64 is required" });
      return;
    }

    const buf = Buffer.from(pdfBase64, "base64");
    const bytes = new Uint8Array(buf);
    const doc = await getDocumentProxy(bytes);
    const { totalPages, text } = await extractText(doc, { mergePages: true });
    const raw = (Array.isArray(text) ? text.join("\n\n") : text)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (raw.length < 50) {
      res.status(400).json({ error: "PDF appears empty or image-only." });
      return;
    }

    req.log?.info({ pages: totalPages, chars: raw.length }, "notes/extract-pdf: parsed");

    const structured = await structureIntoNotes(raw, `PDF (${totalPages} pages)`);
    req.log?.info({ chars: structured.length }, "notes/extract-pdf: structured");

    res.json({ text: structured, pages: totalPages });
  } catch (err) {
    req.log?.error({ err }, "notes/extract-pdf failed");
    res.status(500).json({ error: "pdf_extraction_failed" });
  }
});

// ── POST /ai/notes/extract-url ───────────────────────────────────────────────
// Accepts { url } and returns { text, title }
// Uses Apify website-content-crawler for articles, unpdf for PDF links.
router.post("/notes/extract-url", async (req, res) => {
  try {
    const { url } = req.body ?? {};
    if (typeof url !== "string" || !url.startsWith("http")) {
      res.status(400).json({ error: "A valid http(s) URL is required" });
      return;
    }

    const apifyToken = process.env["APIFY_API_TOKEN"];
    if (!apifyToken) {
      res.status(500).json({ error: "APIFY_API_TOKEN is not configured on the server." });
      return;
    }

    req.log?.info({ url }, "notes/extract-url: starting");

    let raw = "";
    let pageTitle = "";

    // ── PDF link: extract text directly with unpdf ──────────────────────────
    if (url.toLowerCase().endsWith(".pdf")) {
      req.log?.info("notes/extract-url: detected PDF URL");
      const pdfRes = await fetch(url);
      if (!pdfRes.ok) throw new Error(`Failed to fetch PDF (${pdfRes.status})`);
      const arrayBuffer = await pdfRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const doc = await getDocumentProxy(bytes);
      const { text } = await extractText(doc, { mergePages: true });
      raw = (Array.isArray(text) ? text.join("\n\n") : text).trim();
      pageTitle = decodeURIComponent(url.split("/").pop() ?? "")
        .replace(/\.pdf$/i, "")
        .replace(/[-_]/g, " ")
        .trim() || "PDF Document";

    // ── Web article: use Apify website-content-crawler ─────────────────────
    } else {
      req.log?.info("notes/extract-url: calling Apify crawler (matching test-main)");

      const response = await fetch(`https://api.apify.com/v2/acts/apify~website-content-crawler/runs?token=${apifyToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxCrawlPages: 1,
          crawlerType: "playwright:adaptive"
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({})) as any;
        throw new Error(errData.error?.message || "Apify Actor Trigger Failed");
      }

      const runData = await response.json() as any;
      const runId = runData.data.id;
      const defaultDatasetId = runData.data.defaultDatasetId;

      // Hardened Polling Engine: Wait for Actor to transition to SUCCEEDED
      let items: any[] = [];
      let finished = false;
      
      for (let i = 0; i < 25; i++) { // Max ~75 seconds of polling
        await new Promise(r => setTimeout(r, 3000));
        
        const statusRes = await fetch(`https://api.apify.com/v2/acts/apify~website-content-crawler/runs/${runId}?token=${apifyToken}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json() as any;
          const status = statusData.data.status;
          if (status === 'SUCCEEDED') {
            finished = true;
            break;
          } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
            throw new Error(`Apify Crawler ${status} during extraction.`);
          }
        }
      }

      if (!finished) {
        throw new Error("Apify Crawler polling timed out.");
      }

      const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${apifyToken}`);
      if (datasetRes.ok) {
        items = await datasetRes.json() as any[];
      }

      if (!items || items.length === 0) {
         throw new Error("Target URL analysis complete, but no readable Markdown content could be extracted.");
      }

      const item = items[0];
      raw = item.markdown || item.text || "";
      pageTitle = item.metadata?.title || url.split('/').pop() || "Extracted Resource";
    }

    if (!raw || raw.trim().length < 100) {
      res.status(400).json({
        error: "Could not extract meaningful content from that URL. The page may require login or be paywalled.",
      });
      return;
    }

    req.log?.info({ chars: raw.length, pageTitle }, "notes/extract-url: content ready");

    // Just return the raw extracted text like test-main, bypassing the LLM summarization
    res.json({ text: raw, title: pageTitle });
  } catch (err) {
    req.log?.error({ err }, "notes/extract-url failed");
    res.status(500).json({ error: "url_extraction_failed" });
  }
});

// ── POST /ai/notes/generate ──────────────────────────────────────────────────
// Accepts { topic } and returns { text, title }
router.post("/notes/generate", async (req, res) => {
  try {
    const { topic } = req.body ?? {};
    if (typeof topic !== "string" || !topic.trim()) {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    req.log?.info({ topic }, "notes/generate: generating");

    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 8_000,
      messages: [
        {
          role: "system",
          content: [
            "You are an elite UPSC Civil Services mentor creating comprehensive study notes.",
            "Generate exhaustive, exam-focused notes for the given topic.",
            "Structure using: # Title, ## Sub-topics, bullet points (-), **Bold** key terms.",
            "Include: Introduction, Historical Background, Multi-dimensional Analysis",
            "(Social/Economic/Political/Environmental/Security), relevant Articles/Acts/Committees,",
            "Current Affairs relevance, and a concise Way Forward.",
            "Output Markdown only — no preamble or meta-commentary.",
          ].join(" "),
        },
        {
          role: "user",
          content: `Generate comprehensive UPSC study notes on: ${topic.trim()}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";
    req.log?.info({ chars: text.length }, "notes/generate: done");

    res.json({ text, title: topic.trim() });
  } catch (err) {
    req.log?.error({ err }, "notes/generate failed");
    res.status(500).json({ error: "generation_failed" });
  }
});

export default router;
