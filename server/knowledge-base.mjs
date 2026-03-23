import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_INDEX_PATH = path.resolve(process.cwd(), "server", "data", "kb-index.json");
const K1 = 1.5;
const B = 0.75;

const EN_STOPWORDS = new Set([
  "the", "is", "are", "a", "an", "of", "to", "in", "on", "for", "what", "who", "how", "why", "when", "where",
  "and", "or", "with", "please", "tell", "me", "about", "this", "that", "it", "its", "be", "do", "does"
]);

const GREETING_REGEX = /^(你好|您好|嗨|哈喽|在吗|在嘛|hello|hi|hey)\s*[!！。.?？]*$/i;

let cached = null;
let cachedPath = null;
let cachedMtime = null;

function tokenize(query) {
  const lowered = query.toLowerCase();
  const tokens = new Set();
  const words = lowered.match(/[\p{Script=Han}A-Za-z0-9]{1,}/gu) || [];

  for (const word of words) {
    if (!word) continue;

    if (/^[\p{Script=Han}]+$/u.test(word)) {
      if (word.length >= 2) {
        tokens.add(word);
        for (let i = 0; i < word.length - 1; i += 1) {
          tokens.add(word.slice(i, i + 2));
        }
      }
      continue;
    }

    if (/^[a-z0-9]+$/i.test(word)) {
      if (EN_STOPWORDS.has(word)) continue;
      if (word.length >= 3) {
        tokens.add(word);
      }
      continue;
    }

    if (word.length >= 2) {
      tokens.add(word);
    }
  }

  return [...tokens].slice(0, 64);
}

function countOccurrences(text, token) {
  let count = 0;
  let start = 0;
  while (true) {
    const idx = text.indexOf(token, start);
    if (idx === -1) break;
    count += 1;
    start = idx + token.length;
  }
  return count;
}

function trimSnippet(text, limit = 240) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit)}...`;
}

function toKbAnswer(hits) {
  const topHits = hits.slice(0, 3);
  const excerpts = topHits
    .map((hit, idx) => `[${idx + 1}] ${trimSnippet(hit.content)}`)
    .join("\n\n");

  return {
    source: "kb_rag",
    answer: `我在知识库中检索到了相关片段（RAG）：\n\n${excerpts}\n\n如果你愿意，我可以继续把它们整理成步骤清单。`,
    citations: topHits.map((hit) => ({
      file: hit.relPath,
      fileName: hit.fileName,
      score: Number(hit.score.toFixed(3))
    })),
    contextChunks: topHits.map((hit) => ({
      file: hit.relPath,
      content: hit.content,
      score: Number(hit.score.toFixed(3))
    }))
  };
}

export async function loadKnowledgeIndex() {
  const indexPath = process.env.KB_INDEX_PATH?.trim() || DEFAULT_INDEX_PATH;
  const stat = await fs.stat(indexPath);
  const mtime = stat.mtimeMs;

  if (cached && cachedPath === indexPath && cachedMtime === mtime) {
    return cached;
  }

  const raw = await fs.readFile(indexPath, "utf8");
  const json = JSON.parse(raw);
  if (!Array.isArray(json.chunks)) {
    throw new Error(`知识库索引格式错误: ${indexPath}`);
  }

  const chunks = json.chunks.map((chunk) => ({
    ...chunk,
    _text: String(chunk.content || ""),
    _lower: String(chunk.content || "").toLowerCase(),
    _len: Math.max(1, String(chunk.content || "").length)
  }));
  const avgLen = chunks.reduce((sum, c) => sum + c._len, 0) / Math.max(chunks.length, 1);

  cached = {
    meta: {
      sourcePath: json.sourcePath,
      fileCount: json.fileCount || 0,
      chunkCount: json.chunkCount || json.chunks.length,
      generatedAt: json.generatedAt || null,
      avgChunkLength: Number(avgLen.toFixed(2))
    },
    chunks,
    avgLen: Math.max(avgLen, 1)
  };
  cachedPath = indexPath;
  cachedMtime = mtime;

  return cached;
}

export async function answerFromKnowledgeBase(question) {
  const query = (question || "").trim();
  if (!query) {
    return { matched: false, source: "kb_rag", answer: "", citations: [], contextChunks: [] };
  }

  if (GREETING_REGEX.test(query)) {
    return { matched: false, source: "kb_rag", answer: "", citations: [], contextChunks: [] };
  }

  const index = await loadKnowledgeIndex();
  const tokens = tokenize(query);
  if (tokens.length === 0) {
    return { matched: false, source: "kb_rag", answer: "", citations: [], contextChunks: [] };
  }

  const N = index.chunks.length;
  const docFreq = new Map();
  for (const token of tokens) {
    let df = 0;
    for (const chunk of index.chunks) {
      if (chunk._lower.includes(token)) {
        df += 1;
      }
    }
    docFreq.set(token, Math.max(df, 1));
  }

  const scored = [];
  for (const chunk of index.chunks) {
    let score = 0;
    let matchedTokenCount = 0;
    for (const token of tokens) {
      const tf = countOccurrences(chunk._lower, token);
      if (tf === 0) continue;
      matchedTokenCount += 1;
      const df = docFreq.get(token) || 1;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      const denom = tf + K1 * (1 - B + (B * chunk._len) / index.avgLen);
      score += idf * ((tf * (K1 + 1)) / denom);
    }
    if (score > 0) {
      scored.push({ ...chunk, score, matchedTokenCount });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const topK = Number.parseInt(process.env.RAG_TOP_K || "4", 10);
  const minScore = Number.parseFloat(process.env.RAG_MIN_SCORE || "1.1");
  const minTokenMatches = Number.parseInt(process.env.RAG_MIN_TOKEN_MATCHES || "2", 10);
  const hits = scored.slice(0, Math.max(topK, 1));
  const matched =
    hits.length > 0 &&
    hits[0].score >= minScore &&
    (hits[0].matchedTokenCount || 0) >= Math.max(1, minTokenMatches);

  if (!matched) {
    return { matched: false, source: "kb_rag", answer: "", citations: [], contextChunks: [] };
  }

  return {
    matched: true,
    ...toKbAnswer(hits)
  };
}
