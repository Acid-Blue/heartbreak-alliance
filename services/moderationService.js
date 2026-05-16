const { detectSafetyRisk } = require("./safetyService");

const responseTemplates = [
  "我听见你现在最难的是",
  "我经历过相似的部分是",
  "今晚可以先做的一小步是",
  "如果你愿意，可以先把注意力放回"
];

const moderationRules = [
  {
    category: "harassment",
    label: "攻击或羞辱",
    keywords: ["滚", "贱", "垃圾", "去死", "婊", "傻逼", "废物"],
    notice: "这段内容里可能有攻击或羞辱表达。请改成描述自己的感受、事实和需要，避免把伤害继续传给队友。"
  },
  {
    category: "privacy",
    label: "隐私信息",
    keywords: ["手机号", "微信号", "身份证", "住址", "公司地址", "家庭住址"],
    notice: "这段内容可能包含隐私信息。公开小队里不要放手机号、住址、账号或可识别个人身份的信息。"
  },
  {
    category: "spam",
    label: "广告或导流",
    keywords: ["加我微信", "私聊收费", "代挽回", "情感导师", "课程报名"],
    notice: "这段内容像广告、导流或交易信息。阵线小队只保留互助内容，不做付费导流。"
  }
];

function normalizeText(value) {
  return String(value || "").replace(/\s/g, "").toLowerCase();
}

function detectModeration(value) {
  const safety = detectSafetyRisk(value);
  if (safety.hasRisk) {
    return {
      shouldReview: true,
      shouldHide: true,
      category: "safety",
      label: "安全提醒",
      matchedKeyword: safety.matchedKeyword,
      notice: safety.notice
    };
  }

  const text = normalizeText(value);
  const matchedRule = moderationRules.find((rule) => {
    return rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  });

  if (!matchedRule) {
    return {
      shouldReview: false,
      shouldHide: false,
      category: "",
      label: "",
      matchedKeyword: "",
      notice: ""
    };
  }

  return {
    shouldReview: true,
    shouldHide: true,
    category: matchedRule.category,
    label: matchedRule.label,
    matchedKeyword: matchedRule.keywords.find((keyword) => text.includes(keyword.toLowerCase())) || "",
    notice: matchedRule.notice
  };
}

function applyModeration(record, content) {
  const moderation = detectModeration(content);

  if (!moderation.shouldReview) {
    return {
      ...record,
      moderationStatus: "visible",
      isHidden: false,
      moderationNotice: ""
    };
  }

  return {
    ...record,
    moderationStatus: "review",
    moderationCategory: moderation.category,
    moderationLabel: moderation.label,
    isHidden: moderation.shouldHide,
    moderationNotice: moderation.notice
  };
}

function isVisibleRecord(record) {
  return record
    && record.isHidden !== true
    && record.moderationStatus !== "review";
}

module.exports = {
  responseTemplates,
  moderationRules,
  detectModeration,
  applyModeration,
  isVisibleRecord
};
