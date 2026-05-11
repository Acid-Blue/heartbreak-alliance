const https = require("https");
const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-5";
const DEFAULT_MAX_TOKENS = 1200;
const DEFAULT_TEMPERATURE = 1;
const DEFAULT_REQUEST_TIMEOUT_MS = 55000;

exports.main = async (event) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      error: "missing OPENAI_API_KEY"
    };
  }

  try {
    const content = String(event.content || "").trim();
    const context = event.context || {};
    const response = await createChatCompletion({
      apiKey,
      baseUrl: process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL,
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      content,
      context
    });
    const assistantContent = extractAssistantContent(response);
    if (!assistantContent) {
      const choice = Array.isArray(response.choices) ? response.choices[0] : null;
      console.warn("[aiAgent] empty assistant content:", {
        responseId: response.id || "",
        model: response.model || "",
        finishReason: choice && choice.finish_reason ? choice.finish_reason : ""
      });
      throw new Error("AI returned empty content");
    }

    return {
      ok: true,
      data: {
        content: assistantContent,
        responseId: response.id || "",
        model: response.model || process.env.OPENAI_MODEL || DEFAULT_MODEL
      }
    };
  } catch (error) {
    console.error("[aiAgent] request failed:", error);
    return {
      ok: false,
      error: error.message || "aiAgent failed"
    };
  }
};

function createChatCompletion({ apiKey, baseUrl, model, content, context }) {
  const endpoint = new URL(`${baseUrl.replace(/\/$/, "")}/chat/completions`);
  if (endpoint.protocol !== "https:") {
    throw new Error("OPENAI_BASE_URL must start with https://");
  }

  const payload = {
    model,
    messages: buildMessages(content, context),
    temperature: Number(process.env.OPENAI_TEMPERATURE || DEFAULT_TEMPERATURE)
  };
  payload[getMaxTokensParamName({ baseUrl, model })] = Number(process.env.OPENAI_MAX_TOKENS || DEFAULT_MAX_TOKENS);

  const body = JSON.stringify(payload);

  return requestJson({
    hostname: endpoint.hostname,
    path: `${endpoint.pathname}${endpoint.search}`,
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body)
    }
  }, body, Number(process.env.OPENAI_REQUEST_TIMEOUT_MS || DEFAULT_REQUEST_TIMEOUT_MS));
}

function getMaxTokensParamName({ baseUrl, model }) {
  const normalizedBaseUrl = String(baseUrl || "").toLowerCase();
  const normalizedModel = String(model || "").toLowerCase();

  if (normalizedBaseUrl.includes("moonshot") || normalizedModel.startsWith("kimi-")) {
    return "max_completion_tokens";
  }

  return "max_tokens";
}

function buildSystemPrompt() {
  return [
    "你是「失恋阵线联盟」里的陪伴型个人 Agent。",
    "你不是医生、心理咨询师或危机干预人员，不做诊断，不承诺疗效或复合结果。",
    "回复控制在 180 字以内，必须直接输出给用户看的正文。",
    "结构：先承接感受，再问一个小复盘问题，最后给一个很小的下一步行动。",
    "不要鼓励纠缠、骚扰、报复、窥探前任动态。"
  ].join("\n");
}

function buildMessages(content, context) {
  return [
    {
      role: "system",
      content: buildSystemPrompt()
    },
    {
      role: "user",
      content: [
        `用户本次输入：${content}`,
        "",
        "可参考上下文摘要：",
        formatContext(context)
      ].join("\n")
    }
  ];
}

function formatContext(context) {
  const lines = [];

  if (Array.isArray(context.myPosts) && context.myPosts.length > 0) {
    lines.push(`本人发布：${summarizeItems(context.myPosts)}`);
  }

  if (Array.isArray(context.myComments) && context.myComments.length > 0) {
    lines.push(`本人回应：${summarizeItems(context.myComments)}`);
  }

  if (Array.isArray(context.publicPosts) && context.publicPosts.length > 0) {
    lines.push(`小队公开内容：${summarizeItems(context.publicPosts)}`);
  }

  return lines.length > 0 ? lines.join("\n") : "无额外上下文，仅基于本次输入回应。";
}

function summarizeItems(items) {
  return items.slice(0, 4).map((item) => {
    const label = item.typeText || item.reasonText || item.intentText || item.role || "内容";
    return `${label}:${truncate(item.content || item.draft || "", 40)}`;
  }).join("；");
}

function truncate(value, length) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function requestJson(options, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let raw = "";

      response.on("data", (chunk) => {
        raw += chunk;
      });

      response.on("end", () => {
        try {
          const parsed = raw ? JSON.parse(raw) : {};
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(parsed.error && parsed.error.message ? parsed.error.message : `AI request failed: ${response.statusCode}`));
            return;
          }
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("AI request timed out"));
    });
    request.write(body);
    request.end();
  });
}

function extractAssistantContent(response) {
  const choice = response
    && Array.isArray(response.choices)
    && response.choices[0];
  const message = choice && choice.message ? choice.message : {};
  const content = message.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === "string") {
        return part;
      }
      return part && typeof part.text === "string" ? part.text : "";
    }).join("").trim();
  }

  if (typeof message.reasoning_content === "string") {
    return message.reasoning_content.trim();
  }

  return "";
}
