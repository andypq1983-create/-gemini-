import { createServer } from "node:http";
import { loadEnvFile } from "./env.mjs";
import { answerFromKnowledgeBase, loadKnowledgeIndex } from "./knowledge-base.mjs";
import { isLlmConfigured, requestLlmAnswer } from "./llm-client.mjs";

loadEnvFile(".env.local");
loadEnvFile(".env");

const API_PORT = Number.parseInt(process.env.API_PORT || "8787", 10);
const MAX_BODY_SIZE = 1024 * 1024;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      throw new Error("请求体过大");
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return JSON.parse(raw);
}

function formatLlmError(error) {
  const msg = String(error?.message || "");
  if (/insufficient|balance|余额不足/i.test(msg)) {
    return "大模型账户余额不足，暂时无法调用。请先充值或更换可用模型/Key。";
  }
  if (/401|403|unauthorized|forbidden|invalid/i.test(msg)) {
    return "大模型鉴权失败，请检查 LLM_API_KEY、模型名和接口地址。";
  }
  if (/timeout|network|fetch/i.test(msg)) {
    return "大模型网络请求失败，请检查网络连通性或稍后重试。";
  }
  return `大模型暂时不可用：${msg.slice(0, 180)}`;
}

const server = createServer(async (req, res) => {
  try {
    const method = req.method || "GET";
    const url = new URL(req.url || "/", `http://${req.headers.host || `127.0.0.1:${API_PORT}`}`);

    if (method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (method === "GET" && url.pathname === "/api/health") {
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
          useLlmOnHit: String(process.env.RAG_USE_LLM_ON_HIT || "true").toLowerCase() === "true"
        }
      });
      return;
    }

    if (method === "POST" && url.pathname === "/api/qa") {
      const body = await readJsonBody(req);
      const question = String(body?.question || "").trim();
      if (!question) {
        sendJson(res, 400, { ok: false, error: "问题不能为空" });
        return;
      }

      const kbResult = await answerFromKnowledgeBase(question);
      const useLlmOnHit = String(process.env.RAG_USE_LLM_ON_HIT || "true").toLowerCase() === "true";

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
        answer: "知识库未命中，且未配置大模型 API。请在 .env.local 里填写 LLM_API_URL 与 LLM_API_KEY。",
        citations: []
      });
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not Found" });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || "服务异常" });
  }
});

server.listen(API_PORT, "0.0.0.0", () => {
  console.log(`QA API 服务已启动: http://127.0.0.1:${API_PORT}`);
  console.log("提示: 先运行 npm run kb:build 生成知识库索引。");
});
