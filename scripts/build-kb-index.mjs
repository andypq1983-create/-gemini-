import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "../server/env.mjs";
import { textToVector } from "../server/vector.mjs";

loadEnvFile(".env.local");
loadEnvFile(".env");

const DEFAULT_SOURCE_CANDIDATES = [
  "F:\\个人知识库\\02-学习\\04-赵逍遥AI课"
];

const DEFAULT_OUTPUT_PATH = path.resolve(process.cwd(), "server", "data", "kb-index.json");
const CHUNK_SIZE = Number.parseInt(process.env.KB_CHUNK_SIZE || "800", 10);
const CHUNK_OVERLAP = Number.parseInt(process.env.KB_CHUNK_OVERLAP || "120", 10);
const VECTOR_DIM = Number.parseInt(process.env.RAG_VECTOR_DIM || "256", 10);

function sanitizeIdentityText(text) {
  return String(text || "")
    .replace(/\u6f58\s*\u7426/g, "QANTO")
    .replace(/pan\s*qi/gi, "QANTO")
    .replace(/\u6f58AI/g, "QANTO");
}

function resolveSourcePath() {
  const explicit = process.env.KB_SOURCE_PATH?.trim();
  const candidates = explicit ? [explicit, ...DEFAULT_SOURCE_CANDIDATES] : DEFAULT_SOURCE_CANDIDATES;
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  if (!found) {
    throw new Error(`未找到知识库路径，请设置 KB_SOURCE_PATH。尝试过: ${candidates.join(" | ")}`);
  }
  return found;
}

async function walkFiles(entryPath) {
  const stat = await fs.stat(entryPath);
  if (stat.isFile()) {
    return [entryPath];
  }

  const items = await fs.readdir(entryPath, { withFileTypes: true });
  const files = [];

  for (const item of items) {
    if (item.name.startsWith(".")) continue;

    const fullPath = path.join(entryPath, item.name);
    if (item.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    const ext = path.extname(item.name).toLowerCase();
    if ([".md", ".markdown", ".txt", ".json"].includes(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeText(rawText) {
  return sanitizeIdentityText(String(rawText || ""))
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitToChunks(content, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const normalized = normalizeText(content);
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).filter(Boolean);
  const chunks = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    if (buffer.length + paragraph.length + 2 <= chunkSize) {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      continue;
    }

    if (buffer) chunks.push(buffer);

    if (paragraph.length <= chunkSize) {
      buffer = paragraph;
      continue;
    }

    for (let i = 0; i < paragraph.length; i += Math.max(1, chunkSize - overlap)) {
      const piece = paragraph.slice(i, i + chunkSize);
      if (piece.trim()) chunks.push(piece.trim());
    }

    buffer = "";
  }

  if (buffer) chunks.push(buffer);
  return chunks;
}

function roundVector(vec) {
  return vec.map((v) => Number(v.toFixed(6)));
}

async function main() {
  const sourcePath = resolveSourcePath();
  const outputPath = process.env.KB_INDEX_OUTPUT?.trim() || DEFAULT_OUTPUT_PATH;
  const files = await walkFiles(sourcePath);

  if (files.length === 0) {
    throw new Error(`知识库路径下没有可索引文件: ${sourcePath}`);
  }

  const chunks = [];
  let fileCount = 0;

  for (const filePath of files) {
    let content = "";
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const fileChunks = splitToChunks(content);
    if (fileChunks.length === 0) continue;

    fileCount += 1;
    const relPathRaw = path.relative(sourcePath, filePath) || path.basename(filePath);
    const relPath = sanitizeIdentityText(relPathRaw);

    fileChunks.forEach((chunkText, chunkIdx) => {
      chunks.push({
        id: `${fileCount}-${chunkIdx + 1}`,
        relPath,
        fileName: sanitizeIdentityText(path.basename(filePath)),
        chunkIndex: chunkIdx,
        content: chunkText,
        vector: roundVector(textToVector(chunkText, VECTOR_DIM))
      });
    });
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourcePath,
        fileCount,
        chunkCount: chunks.length,
        vectorType: "hash-v1",
        vectorDim: VECTOR_DIM,
        chunks
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`KB 索引已生成: ${outputPath}`);
  console.log(`来源: ${sourcePath}`);
  console.log(`文件数: ${fileCount}, 分片数: ${chunks.length}, 向量维度: ${VECTOR_DIM}`);
}

main().catch((error) => {
  console.error("构建 KB 索引失败:", error.message);
  process.exit(1);
});

