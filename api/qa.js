import { answerFromKnowledgeBase } from "../server/knowledge-base.mjs";
import { isLlmConfigured, requestLlmAnswer } from "../server/llm-client.mjs";
import { formatLlmError, parseBoolean, readJsonBody, sendJson } from "./_common.js";

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";

    if (method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method !== "POST") {
      sendJson(res, 405, { ok: false, error: "Method Not Allowed" });
      return;
    }

    const body = await readJsonBody(req);
    const question = String(body?.question || "").trim();
    if (!question) {
      sendJson(res, 400, { ok: false, error: "问题不能为空" });
      return;
    }

    const kbResult = await answerFromKnowledgeBase(question);
    const useLlmOnHit = parseBoolean(process.env.RAG_USE_LLM_ON_HIT, true);

    if (kbResult.matched) {
      if (useLlmOnHit && isLlmConfigured()) {
        try {
          const ragAnswer = await requestLlmAnswer(question, kbResult.contextChunks || []);
          sendJson(res, 200, {
            ok: true,
            source: "kb_rag_llm",
            answer: ragAnswer,
            citations: kbResult.citations
          });
          return;
        } catch (llmError) {
          sendJson(res, 200, {
            ok: true,
            source: "llm_error",
            answer: formatLlmError(llmError),
            citations: kbResult.citations
          });
          return;
        }
      }

      sendJson(res, 200, {
        ok: true,
        source: "kb_rag",
        answer: kbResult.answer,
        citations: kbResult.citations
      });
      return;
    }

    if (isLlmConfigured()) {
      try {
        const llmAnswer = await requestLlmAnswer(question);
        sendJson(res, 200, {
          ok: true,
          source: "llm",
          answer: llmAnswer,
          citations: []
        });
        return;
      } catch (llmError) {
        sendJson(res, 200, {
          ok: true,
          source: "llm_error",
          answer: formatLlmError(llmError),
          citations: []
        });
        return;
      }
    }

    sendJson(res, 200, {
      ok: true,
      source: "none",
      answer: "知识库未命中，且未配置大模型 API。请在 Vercel 环境变量里填写 LLM_API_URL 与 LLM_API_KEY。",
      citations: []
    });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error?.message || "服务异常" });
  }
}
