const SAFETY_NOTICE = "如果你此刻担心自己或他人的安全，请立即联系身边可信赖的人，或当地紧急救助渠道。不要独自硬撑，也不要等待 Agent 回复。";

const defaultSafetyActions = [
  "离开可能伤害自己或他人的物品、地点和聊天窗口。",
  "去到有人能看见你的地方，或打开房门、灯光和通话。",
  "把当前这句话发给一个现实中可信赖的人，请对方现在陪你。",
  "如果已经无法保证安全，立即联系当地紧急救助渠道。"
];

const nightSupportSteps = [
  "先把屏幕亮度调低，停止翻旧聊天和动态。",
  "喝水、坐直，慢慢呼气 5 次，让身体先降速。",
  "只写 3 句话：现在几点、我在哪里、我最强的念头是什么。",
  "把手机放到床以外的位置，10 分钟内只做一个低刺激动作。"
];

const safetyRules = [
  {
    kind: "selfHarm",
    label: "伤害自己",
    keywords: ["不想活", "活不下去", "自杀", "自残", "伤害自己", "结束生命", "死了算了", "割腕", "跳楼", "轻生"],
    notice: SAFETY_NOTICE
  },
  {
    kind: "harmOthers",
    label: "伤害他人",
    keywords: ["伤害他人", "报复", "杀了", "弄死", "同归于尽", "让他付出代价"],
    notice: SAFETY_NOTICE
  },
  {
    kind: "cannotStaySafe",
    label: "无法保证安全",
    keywords: ["控制不住", "撑不住了", "我怕我会做傻事", "我怕自己出事", "马上去找他算账"],
    notice: SAFETY_NOTICE
  }
];

function normalizeText(value) {
  return String(value || "").replace(/\s/g, "");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isNightTime(date) {
  const target = date || new Date();
  const hour = target.getHours();
  return hour >= 22 || hour < 6;
}

function detectSafetyRisk(value, reason) {
  const text = normalizeText(value);
  const matchedRule = safetyRules.find((rule) => {
    return rule.keywords.some((keyword) => text.includes(keyword));
  });
  const matchedKeyword = matchedRule
    ? matchedRule.keywords.find((keyword) => text.includes(keyword)) || ""
    : "";
  const selectedSafetyConcern = reason === "unsafe";
  const hasRisk = selectedSafetyConcern || Boolean(matchedRule);

  return {
    hasRisk,
    matchedKind: matchedRule ? matchedRule.kind : (selectedSafetyConcern ? "selectedSafetyConcern" : ""),
    matchedLabel: matchedRule ? matchedRule.label : (selectedSafetyConcern ? "担心安全" : ""),
    matchedKeyword,
    notice: hasRisk ? SAFETY_NOTICE : "",
    actions: hasRisk ? clone(defaultSafetyActions) : []
  };
}

module.exports = {
  SAFETY_NOTICE,
  defaultSafetyActions,
  nightSupportSteps,
  isNightTime,
  detectSafetyRisk
};
