function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function testBm25(chunks, query, k = 5) {
  if (!chunks.length) return [];

  const K1 = 1.5;
  const B = 0.75;

  const tokenizedChunks = chunks.map(tokenize);
  const avgdl =
    tokenizedChunks.reduce((s, t) => s + t.length, 0) / tokenizedChunks.length;
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
      score +=
        (idf[term] ?? 0) *
        ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (dl / avgdl))));
    }
    return { chunk, score };
  });

  const validScored = scored.filter(s => s.score > 0);
  validScored.sort((a, b) => b.score - a.score);
  return validScored.slice(0, k).map((s) => s.chunk);
}

const chunks = ["Constitution\nHere is some text about the constitution of India."];
const best = testBm25(chunks, "constitution", 4);
console.log("Matched chunks length:", best.length);
