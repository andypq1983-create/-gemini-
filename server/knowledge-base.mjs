import fs from "node:fs/promises";
import path from "node:path";
import { cosineSimilarity, ensureVector, textToVector } from "./vector.mjs";

const DEFAULT_INDEX_PATH = path.resolve(process.cwd(), "server", "data", "kb-index.json");
const K1 = 1.5;
const B = 0.75;

const EN_STOPWORDS = new Set([
  "the", "is", "are", "a", "an", "of", "to", "in", "on", "for", "what", "who", "how", "why", "when", "where",
  "and", "or", "with", "please", "tell", "me", "about", "this", "that", "it", "its", "be", "do", "does"
]);

const CN_GENERIC_STOPWORDS = new Set([
  "\u7684", "\u4e86", "\u5462", "\u5417", "\u554a", "\u5440", "\u662f", "\u5728", "\u548c", "\u4e0e", "\u53ca", "\u6216"
]);

const GREETING_REGEX = /^(你好|您好|嗨|哈喽|在吗|在嘛|hello|hi|hey)\s*[!！。.?？]*$/i;

let cached = null;
let cachedPath = null;
let cachedMtime = null;

function sanitizeIdentityText(text) {
  return String(text || "")
    .replace(/\u6f58\s*\u7426/g, "QANTO")
    .replace(/pan\s*qi/gi, "QANTO")
    .replace(/\u6f58AI/g, "QANTO");
}
function normalizeForSearch(text) {
  return sanitizeIdentityText(String(text || ""))
    .toLowerCase()
    .replace(/[^\p{Script=Han}A-Za-z0-9]+/gu, "")
    .trim();
}

function tokenize(query) {
  const lowered = String(query || "").toLowerCase();
  const tokens = new Set();
  const words = lowered.match(/[\p{Script=Han}]+|[A-Za-z0-9]+/gu) || [];

  for (const word of words) {
    if (!word) continue;

    if (/^[\p{Script=Han}]+$/u.test(word)) {
      if (word.length < 2) continue;

      tokens.add(word);
      for (let i = 0; i < word.length - 1; i += 1) {
        tokens.add(word.slice(i, i + 2));
      }
      if (word.length >= 4) {
        for (let i = 0; i < word.length - 2; i += 1) {
          tokens.add(word.slice(i, i + 3));
        }
      }
      continue;
    }

    if (/^[a-z0-9]+$/i.test(word)) {
      if (EN_STOPWORDS.has(word)) continue;
      if (word.length >= 3) tokens.add(word);
      continue;
    }

    if (word.length >= 2) tokens.add(word);
  }

  return [...tokens].slice(0, 96);
}

function extractStrongKeywords(query) {
  const lowered = String(query || "").toLowerCase();
  const keywords = new Set();
  const words = lowered.match(/[\p{Script=Han}]+|[A-Za-z0-9]+/gu) || [];

  for (const word of words) {
    if (/^[a-z0-9]+$/i.test(word)) {
      if (EN_STOPWORDS.has(word)) continue;
      if (word.length >= 4) keywords.add(word);
      continue;
    }

    if (/^[\p{Script=Han}]+$/u.test(word)) {
      if (word.length >= 3 && !CN_GENERIC_STOPWORDS.has(word)) keywords.add(word);
    }
  }

  return [...keywords].slice(0, 24);
}

function extractAsciiQueryWords(query) {
  const words = String(query || "").toLowerCase().match(/[a-z0-9]{4,}/g) || [];
  return words.filter((w) => !EN_STOPWORDS.has(w));
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
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit)}...`;
}

function toKbAnswer(hits) {
  const topHits = hits.slice(0, 3);
  const excerpts = topHits
    .map((hit, idx) => `[${idx + 1}] ${trimSnippet(sanitizeIdentityText(hit.content))}`)
    .join("\n\n");

  return {
    source: "kb_rag",
    answer: `我在知识库中检索到相关片段（向量+关键词）：\n\n${excerpts}\n\n如果你愿意，我可以继续把它们整理成步骤清单。`,
    citations: topHits.map((hit) => ({
      file: sanitizeIdentityText(hit.relPath),
      fileName: sanitizeIdentityText(hit.fileName),
      score: Number(hit.hybridScore.toFixed(3)),
      vectorScore: Number((hit.vectorScore || 0).toFixed(3))
    })),
    contextChunks: topHits.map((hit) => ({
      file: sanitizeIdentityText(hit.relPath),
      content: sanitizeIdentityText(hit.content),
      score: Number(hit.hybridScore.toFixed(3)),
      vectorScore: Number((hit.vectorScore || 0).toFixed(3))
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

  const vectorDim = Number.parseInt(String(json.vectorDim || process.env.RAG_VECTOR_DIM || 256), 10);
  const chunks = json.chunks.map((chunk) => {
    const text = sanitizeIdentityText(String(chunk.content || ""));
    return {
      ...chunk,
      relPath: sanitizeIdentityText(chunk.relPath),
      fileName: sanitizeIdentityText(chunk.fileName),
      _text: text,
      _lower: text.toLowerCase(),
      _norm: normalizeForSearch(text),
      _len: Math.max(1, text.length),
      _vector: ensureVector(chunk.vector, text, vectorDim)
    };
  });

  const avgLen = chunks.reduce((sum, c) => sum + c._len, 0) / Math.max(chunks.length, 1);

  cached = {
    meta: {
      sourcePath: json.sourcePath,
      fileCount: json.fileCount || 0,
      chunkCount: json.chunkCount || json.chunks.length,
      generatedAt: json.generatedAt || null,
      avgChunkLength: Number(avgLen.toFixed(2)),
      vectorType: json.vectorType || "hash-v1",
      vectorDim
    },
    chunks,
    avgLen: Math.max(avgLen, 1),
    vectorDim
  };

  cachedPath = indexPath;
  cachedMtime = mtime;
  return cached;
}

export async function answerFromKnowledgeBase(question) {
  const query = String(question || "").trim();
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

  const queryNorm = normalizeForSearch(query);
  const strongKeywords = extractStrongKeywords(query);
  const asciiQueryWords = extractAsciiQueryWords(query);
  const queryVector = textToVector(query, index.vectorDim || 256);
  const N = index.chunks.length;

  const docFreq = new Map();
  for (const token of tokens) {
    let df = 0;
    for (const chunk of index.chunks) {
      if (chunk._lower.includes(token)) df += 1;
    }
    docFreq.set(token, Math.max(df, 1));
  }

  const scored = [];
  const vectorWeight = Number.parseFloat(process.env.RAG_VECTOR_WEIGHT || "8");

  for (const chunk of index.chunks) {
    let lexicalScore = 0;
    let matchedTokenCount = 0;

    for (const token of tokens) {
      const tf = countOccurrences(chunk._lower, token);
      if (tf === 0) continue;

      matchedTokenCount += 1;
      const df = docFreq.get(token) || 1;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      const denom = tf + K1 * (1 - B + (B * chunk._len) / index.avgLen);
      lexicalScore += idf * ((tf * (K1 + 1)) / denom);
    }

    const exactPhraseMatch = Boolean(queryNorm && queryNorm.length >= 4 && chunk._norm.includes(queryNorm));
    if (exactPhraseMatch) {
      lexicalScore += 2.2;
    }

    let keywordHitCount = 0;
    for (const keyword of strongKeywords) {
      if (chunk._lower.includes(keyword)) keywordHitCount += 1;
    }
    if (keywordHitCount > 0) {
      lexicalScore += Math.min(keywordHitCount, 2) * 0.7;
    }

    const vectorScore = cosineSimilarity(queryVector, chunk._vector);
    const hybridScore = lexicalScore + vectorScore * vectorWeight;
    if (hybridScore <= 0) continue;

    const coverage = matchedTokenCount / Math.max(tokens.length, 1);
    scored.push({
      ...chunk,
      lexicalScore,
      vectorScore,
      hybridScore,
      matchedTokenCount,
      coverage,
      exactPhraseMatch,
      keywordHitCount
    });
  }

  scored.sort((a, b) => b.hybridScore - a.hybridScore);

  const topK = Number.parseInt(process.env.RAG_TOP_K || "4", 10);
  const minScore = Number.parseFloat(process.env.RAG_MIN_SCORE || "1.2");
  const minTokenMatches = Number.parseInt(process.env.RAG_MIN_TOKEN_MATCHES || "2", 10);
  const minCoverage = Number.parseFloat(process.env.RAG_MIN_TOKEN_COVERAGE || "0.28");
  const minVectorScore = Number.parseFloat(process.env.RAG_MIN_VECTOR_SCORE || "0.30");

  const hits = scored.slice(0, Math.max(topK, 1));
  if (hits.length === 0) {
    return { matched: false, source: "kb_rag", answer: "", citations: [], contextChunks: [] };
  }

  const top = hits[0];
  const second = hits[1];
  const gapRatio = second ? top.hybridScore / Math.max(second.hybridScore, 1e-9) : 99;

  const strongExact = top.exactPhraseMatch && top.coverage >= 0.2;
  const strongBm25 =
    top.lexicalScore >= minScore &&
    (top.matchedTokenCount || 0) >= Math.max(1, minTokenMatches) &&
    top.coverage >= minCoverage;
  const strongKeyword =
    (top.keywordHitCount || 0) >= 1 &&
    top.lexicalScore >= minScore * 0.85 &&
    top.coverage >= 0.01;
  const strongVector = top.vectorScore >= minVectorScore;
  const notAmbiguous = gapRatio >= 1.03 || strongExact;

  const asciiHardMiss =
    asciiQueryWords.length > 0 &&
    !asciiQueryWords.every((w) => top._lower.includes(w));

  const matched =
    (strongExact || (strongBm25 && notAmbiguous) || strongKeyword || strongVector) &&
    !(asciiHardMiss && top.vectorScore < 0.45);
  if (!matched) {
    return { matched: false, source: "kb_rag", answer: "", citations: [], contextChunks: [] };
  }

  return {
    matched: true,
    ...toKbAnswer(hits)
  };
}

