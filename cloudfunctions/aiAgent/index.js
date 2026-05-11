const https = require("https");
const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const DEFAULT_MODEL = "gpt-5";

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
    const response = await createResponse({
      apiKey,
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      content,
      context
    });

    return {
      ok: true,
      data: {
        content: extractOutputText(response),
        responseId: response.id || "",
        model: response.model || process.env.OPENAI_MODEL || DEFAULT_MODEL
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "aiAgent failed"
    };
  }
};

function createResponse({ apiKey, model, content, context }) {
  const body = JSON.stringify({
    model,
    instructions: buildInstructions(),
    input: buildInput(content, context),
    max_output_tokens: 420
  });

  return requestJson({
    hostname: "api.openai.com",
    path: "/v1/responses",
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body)
    }
  }, body);
}

function buildInstructions() {
  return [
    "你是「失恋阵线联盟」里的陪伴型个人 Agent。",
    "你不是医生、心理咨询师或危机干预人员，不做诊断，不承诺疗效或复合结果。",
    "回复必须克制、温和、具体。先承接感受，再提出一个小复盘问题，最后给一个很小的下一步行动。",
    "不要鼓励纠缠、骚扰、报复、窥探前任动态，避免命令式建议。",
    "如果用户表达自伤、伤害他人或无法保证安全，优先建议联系现实中的可信赖支持或当地紧急救助渠道。"
  ].join("\n");
}

function buildInput(content, context) {
  return [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: [
            `用户本次输入：${content}`,
            "",
            "可参考上下文摘要：",
            formatContext(context)
          ].join("\n")
        }
      ]
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

function requestJson(options, body) {
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
            reject(new Error(parsed.error && parsed.error.message ? parsed.error.message : `OpenAI request failed: ${response.statusCode}`));
            return;
          }
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

function extractOutputText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  const output = Array.isArray(response.output) ? response.output : [];
  const chunks = [];

  output.forEach((item) => {
    const content = Array.isArray(item.content) ? item.content : [];
    content.forEach((part) => {
      if (part.text) {
        chunks.push(part.text);
      }
    });
  });

  return chunks.join("").trim();
}
