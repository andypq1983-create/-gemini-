function pickContent(messageContent) {
  if (typeof messageContent === "string") {
    return messageContent;
  }
  if (Array.isArray(messageContent)) {
    return messageContent
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.type === "text" && typeof item?.text === "string") return item.text;
        if (typeof item?.content === "string") return item.content;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

function normalizeApiUrl(rawUrl, format) {
  const raw = String(rawUrl || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (!parsed.pathname || parsed.pathname === "/") {
      parsed.pathname = format === "openai-responses" ? "/v1/responses" : "/v1/chat/completions";
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

function getCandidateUrls(rawUrl, format) {
  const normalized = normalizeApiUrl(rawUrl, format);
  const urls = [normalized];

  try {
    const parsed = new URL(normalized);
    if (parsed.hostname === "cloud.siliconflow.cn") {
      const fallback =
        format === "openai-responses"
          ? "https://api.siliconflow.cn/v1/responses"
          : "https://api.siliconflow.cn/v1/chat/completions";
      if (!urls.includes(fallback)) {
        urls.push(fallback);
      }
    }
  } catch {
    // ignore
  }

  return urls;
}

export function isLlmConfigured() {
  return Boolean(process.env.LLM_API_URL && process.env.LLM_API_KEY);
}

export async function requestLlmAnswer(question, contextChunks = []) {
  const rawApiUrl = process.env.LLM_API_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B";
  const format = (process.env.LLM_API_FORMAT || "openai-chat").toLowerCase();
  const authHeader = process.env.LLM_AUTH_HEADER || "Authorization";
  const authScheme = process.env.LLM_AUTH_SCHEME || "Bearer";

  if (!rawApiUrl || !apiKey) {
    throw new Error("未配置 LLM_API_URL 或 LLM_API_KEY");
  }

  const contextText = contextChunks.length
    ? contextChunks
        .map((item, idx) => `【片段${idx + 1} | ${item.file}】\n${item.content}`)
        .join("\n\n")
    : "";

  const systemPrompt = contextChunks.length
    ? "你是网站问答助手。请优先使用提供的知识库片段回答，不要编造片段中没有的信息。"
    : "你是网站问答助手。请直接、准确回答，优先给可执行结论。";

  const userPrompt = contextChunks.length
    ? `用户问题：${question}\n\n知识库片段：\n${contextText}`
    : question;

  let payload;
  if (format === "openai-responses") {
    payload = {
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    };
  } else {
    payload = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3
    };
  }

  const headers = {
    "Content-Type": "application/json",
    [authHeader]: authScheme ? `${authScheme} ${apiKey}` : apiKey
  };

  const candidateUrls = getCandidateUrls(rawApiUrl, format);
  let lastError = new Error("LLM 请求失败");

  for (const apiUrl of candidateUrls) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text();
        lastError = new Error(`LLM 请求失败: ${response.status} ${text.slice(0, 300)}`);
        continue;
      }

      const data = await response.json();
      const answer =
        data?.output_text ||
        pickContent(data?.choices?.[0]?.message?.content) ||
        pickContent(data?.output?.[0]?.content) ||
        "模型返回为空。";

      return answer;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}
