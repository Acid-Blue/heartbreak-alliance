const SAFETY_NOTICE = "如果你此刻担心自己或他人的安全，请立即联系身边可信赖的人，或当地紧急救助渠道。不要独自硬撑，也不要等待 Agent 回复。";

const safetyKeywords = [
  "不想活",
  "活不下去",
  "自杀",
  "自残",
  "伤害自己",
  "结束生命",
  "死了算了",
  "割腕",
  "跳楼",
  "伤害他人",
  "报复",
  "杀了",
  "弄死"
];

function normalizeText(value) {
  return String(value || "").replace(/\s/g, "");
}

function detectSafetyRisk(value, reason) {
  const text = normalizeText(value);
  const matchedKeyword = safetyKeywords.find((keyword) => text.includes(keyword)) || "";
  const hasRisk = reason === "unsafe" || Boolean(matchedKeyword);

  return {
    hasRisk,
    matchedKeyword,
    notice: hasRisk ? SAFETY_NOTICE : ""
  };
}

module.exports = {
  SAFETY_NOTICE,
  detectSafetyRisk
};
