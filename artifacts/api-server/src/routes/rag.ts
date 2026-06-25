import { Router, type IRouter } from "express";
import { pinecone } from "../lib/pinecone";
import { adminDb } from "../lib/firebaseAdmin";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// Matches the generateUPSCIdentity from web-v2
async function generateUPSCIdentity(text: string): Promise<number[]> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || "";
    if (!apiKey) {
      throw new Error("Missing Native Google API Credentials.");
    }
    const taskText = `Represent this UPSC academic sentence for retrieval: ${text}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-2",
        content: { parts: [{ text: taskText }] },
        outputDimensionality: 3072
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Native Embedding Fetch Failed: ${errorBody.substring(0, 100)}`);
    }
    const data = await response.json() as any;
    return data.embedding?.values;
  } catch (error) {
    console.error("Vectorization Semantic Error:", error);
    throw new Error("Failed to generate vector semantic signature.");
  }
}

// Generate hashtags helper (simplified version of the web app's)
function generateDynamicHashtags(title: string, content: string, existingTags: string[] = []): string[] {
    const text = (title + " " + content).toLowerCase();
    const tags = new Set<string>(existingTags.map(t => t.toLowerCase()));
    if (text.includes("polity") || text.includes("constitution") || text.includes("supreme court")) tags.add("polity");
    if (text.includes("economy") || text.includes("rbi") || text.includes("inflation")) tags.add("economy");
    if (text.includes("environment") || text.includes("climate") || text.includes("pollution")) tags.add("environment");
    if (text.includes("history") || text.includes("movement") || text.includes("gandhi")) tags.add("history");
    if (text.includes("geography") || text.includes("monsoon") || text.includes("river")) tags.add("geography");
    if (text.includes("tech") || text.includes("space") || text.includes("isro")) tags.add("science & tech");
    if (text.includes("international") || text.includes("treaty") || text.includes("un")) tags.add("ir");
    return Array.from(tags);
}

export interface UpdatePayload {
  title: string;
  source: string;
  date: string;
  excerpt: string;
  imageUrl?: string;
  id: string;
  content?: string;
}

router.post("/api/rag/sync", async (req, res) => {
  try {
    const { noteId } = req.body ?? {};
    if (!noteId) {
      res.status(400).json({ error: "noteId is required" });
      return;
    }

    req.log?.info({ noteId }, "rag/sync: starting sync process");

    const noteDoc = await adminDb.collection("cloud_notes").doc(noteId).get();
    if (!noteDoc.exists) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const note = noteDoc.data() as any;
    const sessionStartTime = Date.now();
    let vector = note.embedding;

    const textToEmbed = `${note.title || "Untitled"}\n${(note.content || "").substring(0, 1000)}`;

    if (typeof vector === 'string') {
        try { vector = JSON.parse(vector); } catch (e) { vector = null; }
    }
    // Check if vector exists and has the correct dimensions (3072 for gemini-embedding-2, previously 768)
    if (!vector || !Array.isArray(vector) || (vector.length !== 3072 && vector.length !== 768)) {
        try {
            vector = await generateUPSCIdentity(textToEmbed);
            await adminDb.collection("cloud_notes").doc(noteId).update({
                embedding: JSON.stringify(vector)
            });
        } catch (e) {
            req.log?.warn({ err: e }, "Failed to generate vector");
            res.status(500).json({ error: "Vector generation failed" });
            return;
        }
    }

    if (!vector) {
        res.status(500).json({ error: "No vector available for sync" });
        return;
    }

    // Upsert to Pinecone cloud-vault index
    try {
      const index = pinecone.index('cloud-vault');
      await index.upsert([{
          id: noteId,
          values: vector,
          metadata: {
            userId: note.userId || 'unknown',
            title: note.title || '',
            subject: note.subject || '',
            type: note.type || 'note',
            tags: note.tags || [],
            content: (note.content || "").substring(0, 3000),
            isStaged: note.isStaged === true,
            created_at: new Date(note.createdAt || Date.now()).toISOString()
          }
      }]);
      req.log?.info({ noteId }, "rag/sync: successfully upserted note to Pinecone cloud-vault");
    } catch (e) {
      req.log?.warn({ err: e }, "Pinecone cloud-vault upsert failed");
    }

    // If it's a staged note, we ONLY ingest it into Pinecone, we don't query for updates
    if (note.isStaged) {
      res.json({ success: true, message: "Raw note successfully vectorized and stored in Pinecone." });
      return;
    }

    const matchedNews: UpdatePayload[] = [];
    const matchedVault: UpdatePayload[] = [];

    // 1. SCAN NEWS FROM PINECONE
    try {
        const affairsIndex = pinecone.index('current-affairs');
        const affairsQuery = await affairsIndex.query({
            vector,
            topK: 3,
            includeMetadata: true
        });
        const affairsResults = (affairsQuery.matches || []).filter(m => (m.score || 0) >= 0.55);

        for (const res of affairsResults) {
            const payload = res.metadata as any;
            if (!payload) continue;
            matchedNews.push({
            title: payload.title || payload.metadata?.title || "Global Update",
            source: `${payload.source || payload.metadata?.source || "Current Affairs"}`,
            date: (payload.publish_date || payload.publishDate || payload.created_at || payload.metadata?.created_at || new Date().toISOString().split('T')[0]),
            excerpt: payload.content ? payload.content.substring(0, 5000) : "Context synchronized.",
            imageUrl: payload.imageUrl || payload.fileUrl || payload.metadata?.imageUrl,
            id: res.id,
            content: payload.content || ""
            });
        }
    } catch (e) {
        req.log?.warn({ err: e }, "Pinecone current-affairs match failed");
    }

    // 2. SCAN VAULT FROM PINECONE
    try {
        const vaultIndex = pinecone.index('cloud-vault');
        const vaultQuery = await vaultIndex.query({
            vector,
            topK: 3,
            includeMetadata: true
        });
        const vaultResults = (vaultQuery.matches || []).filter(m => (m.score || 0) >= 0.50);

        for (const res of vaultResults) {
            const payload = res.metadata as any;
            if (!payload || payload.isMaster) continue; // Don't match other core notes
            matchedVault.push({
            title: payload.title || "Vault Data",
            source: "Personal Vault",
            date: (payload.created_at || new Date().toISOString().split('T')[0]),
            excerpt: payload.content ? payload.content.substring(0, 5000) : "Data merged.",
            imageUrl: payload.fileUrl || payload.imageUrl,
            id: res.id,
            content: payload.content || ""
            });
        }
    } catch (e) {
        req.log?.warn({ err: e }, "Pinecone cloud-vault match failed");
    }

    async function verifyAndSnippetMatches(noteTitle: string, noteContent: string, potentialMatches: UpdatePayload[]) {
        if (potentialMatches.length === 0) return [];
        try {
            const prompt = `
            You are a UPSC Metadata Architect. Verify if updates are TRULY related to a study note.
            ### STUDY NOTE:
            Title: ${noteTitle}
            Content: ${noteContent.substring(0, 1000)}
            ### CANDIDATE UPDATES:
            ${potentialMatches.map((m, i) => `[ID: ${i}] ${m.title}\\nSource: ${m.source}\\nContent: ${m.excerpt.substring(0, 800)}`).join('\\n\\n')}
            ### PROTOCOL:
            1. Verify overlap.
            2. Extract ONLY 1-3 specific sentences representing the update.
            OUTPUT ONLY A VALID JSON ARRAY. Format: [{"id": 0, "snippet": "Specific snippet..."}]`;

            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "openai/gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.1
                })
            });

            if (!res.ok) return potentialMatches.slice(0, 3);
            const data = await res.json() as any;
            const rawOutput = data.choices?.[0]?.message?.content || "[]";
            const cleanedOutput = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
            const verifiedIds = JSON.parse(cleanedOutput);

            const uniqueIndexes = new Set<number>();
            const finalVerified: UpdatePayload[] = [];
            if (!verifiedIds || !Array.isArray(verifiedIds) || verifiedIds.length === 0) {
                return potentialMatches.map(m => ({ ...m, excerpt: m.excerpt.substring(0, 150) + "..." }));
            }
            for (const v of verifiedIds) {
                if (typeof v.id === 'number' && v.id >= 0 && v.id < potentialMatches.length) {
                    if (!uniqueIndexes.has(v.id)) {
                        uniqueIndexes.add(v.id);
                        finalVerified.push({ ...potentialMatches[v.id], excerpt: v.snippet });
                    }
                }
            }
            return finalVerified;
        } catch (e) {
            return potentialMatches.slice(0, 3);
        }
    }

    let finalNews = matchedNews;
    if (matchedNews.length > 0) {
        finalNews = await verifyAndSnippetMatches(note.title, note.content || "", matchedNews);
    }

    // 3. WRITE UPDATES BACK TO FIRESTORE
    if (finalNews.length > 0 || matchedVault.length > 0) {
        const existingUpdates = note.updatesList || [];
        
        // Filter out duplicates based on exact same source/title
        const newUpdates = [...finalNews, ...matchedVault].filter(nu => 
            !existingUpdates.some((eu: any) => eu.title === nu.title && eu.source === nu.source)
        );

        if (newUpdates.length > 0) {
            const finalUpdatesList = [...existingUpdates, ...newUpdates];
            await adminDb.collection("cloud_notes").doc(noteId).update({
                hasUpdates: true,
                updatesList: finalUpdatesList,
                lastRAGSyncDate: sessionStartTime
            });
            req.log?.info({ newUpdatesCount: newUpdates.length }, "rag/sync: successful sync with new updates");
        } else {
            await adminDb.collection("cloud_notes").doc(noteId).update({
                lastRAGSyncDate: sessionStartTime
            });
            req.log?.info("rag/sync: sync successful, but no new unique updates");
        }
    } else {
        await adminDb.collection("cloud_notes").doc(noteId).update({
            lastRAGSyncDate: sessionStartTime
        });
        req.log?.info("rag/sync: sync successful, no matches found");
    }

    res.json({ success: true, message: "RAG sync complete" });
  } catch (err) {
    req.log?.error({ err }, "rag/sync failed");
    res.status(500).json({ error: "rag_sync_failed" });
  }
});

export default router;
