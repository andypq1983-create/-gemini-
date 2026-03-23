const MAX_BODY_SIZE = 1024 * 1024;

export function applyCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

export function sendJson(res, status, payload) {
  applyCors(res);
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

export function parseBoolean(raw, fallback = false) {
  if (typeof raw === "undefined" || raw === null || raw === "") {
    return fallback;
  }
  return String(raw).toLowerCase() === "true";
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }

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

export function formatLlmError(error) {
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
