import { loadKnowledgeIndex } from "../server/knowledge-base.mjs";
import { isLlmConfigured } from "../server/llm-client.mjs";
import { parseBoolean, sendJson } from "./_common.js";

export default async function handler(req, res) {
  try {
    if ((req.method || "GET") === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if ((req.method || "GET") !== "GET") {
      sendJson(res, 405, { ok: false, error: "Method Not Allowed" });
      return;
    }

    let kbMeta = null;
    try {
      kbMeta = (await loadKnowledgeIndex()).meta;
    } catch {
      kbMeta = null;
    }

    sendJson(res, 200, {
      ok: true,
      kbLoaded: Boolean(kbMeta),
      kbMeta,
      llmConfigured: isLlmConfigured(),
      ragConfig: {
        topK: Number.parseInt(process.env.RAG_TOP_K || "4", 10),
        minScore: Number.parseFloat(process.env.RAG_MIN_SCORE || "1.2"),
        minVectorScore: Number.parseFloat(process.env.RAG_MIN_VECTOR_SCORE || "0.22"),
        vectorWeight: Number.parseFloat(process.env.RAG_VECTOR_WEIGHT || "8"),
        vectorDim: Number.parseInt(process.env.RAG_VECTOR_DIM || "256", 10),
        useLlmOnHit: parseBoolean(process.env.RAG_USE_LLM_ON_HIT, true)
      }
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error?.message || "服务异常" });
  }
}
