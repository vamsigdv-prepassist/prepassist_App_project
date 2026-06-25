import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCi5nA-ZtNLgVDM0UIJj7cWrPQhulEPy70",
  authDomain: "prepassist-v2.firebaseapp.com",
  projectId: "prepassist-v2",
  storageBucket: "prepassist-v2.firebasestorage.app",
  messagingSenderId: "848376794933",
  appId: "1:848376794933:web:6f10da60d65ccdc470067c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function bm25Retrieve(chunks, query, k = 5) {
  if (!chunks.length) return [];
  const K1 = 1.5;
  const B = 0.75;
  const tokenizedChunks = chunks.map(tokenize);
  const avgdl = tokenizedChunks.reduce((s, t) => s + t.length, 0) / tokenizedChunks.length;
  const N = chunks.length;
  const queryTerms = [...new Set(tokenize(query))];
  const idf = {};
  for (const term of queryTerms) {
    const df = tokenizedChunks.filter((c) => c.includes(term)).length;
    idf[term] = Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }
  const scored = chunks.map((chunk, i) => {
    const tokens = tokenizedChunks[i];
    const dl = tokens.length;
    const tf = {};
    for (const t of tokens) tf[t] = (tf[t] ?? 0) + 1;
    let score = 0;
    for (const term of queryTerms) {
      const f = tf[term] ?? 0;
      if (f === 0) continue;
      score += (idf[term] ?? 0) * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (dl / avgdl))));
    }
    return { chunk, score };
  });
  const validScored = scored.filter(s => s.score > 0);
  validScored.sort((a, b) => b.score - a.score);
  return validScored.slice(0, k).map((s) => s.chunk);
}

async function run() {
  const userId = "cae718e8-5fc5-454a-870e-ca884b878f16";
  const q = query(collection(db, "cloud_notes"), where("userId", "==", userId));
  const snap = await getDocs(q);
  const vaultNotes = [];
  snap.forEach(doc => vaultNotes.push(doc.data()));
  
  const allSearchableNotes = vaultNotes.filter(n => n.content && !n.content.includes("AI Extraction Offline"));
  const userQ = "repo rate impact";
  const chunks = allSearchableNotes.map(n => n.title + "\n" + n.content);
  
  const bestChunks = bm25Retrieve(chunks, userQ, 4);
  const matchedVaultNotes = allSearchableNotes.filter(n => bestChunks.includes(n.title + "\n" + n.content));
  
  matchedVaultNotes.forEach(n => console.log("Matched Title:", n.title, "isStaged:", n.isStaged));
}
run().catch(console.error);
