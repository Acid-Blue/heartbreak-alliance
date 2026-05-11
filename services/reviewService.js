const { createLocalId } = require("../utils/id");
const localStore = require("../utils/localStore");
const { detectSafetyRisk } = require("./safetyService");

const REVIEW_RECORDS_KEY = "heartbreakAlliance.reviewRecords";

const contactIntents = [
  { value: "impulse", label: "想立刻发消息" },
  { value: "explain", label: "想解释或道歉" },
  { value: "reconcile", label: "想复合" },
  { value: "boundary", label: "想确认边界" },
  { value: "practical", label: "有现实事务" }
];

const waitOptions = [
  { value: "none", label: "还没等过" },
  { value: "tenMinutes", label: "已经等过 10 分钟" },
  { value: "day", label: "已经等过 24 小时" },
  { value: "week", label: "已经过了一周" }
];

const urgeLevels = [1, 2, 3, 4, 5];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getReviewRecords() {
  return Promise.resolve(clone(localStore.readArray(REVIEW_RECORDS_KEY)));
}

function createContactDecision(payload) {
  const draft = (payload.draft || "").trim();

  if (!draft) {
    return Promise.reject(new Error("empty review draft"));
  }

  const intent = contactIntents.find((item) => item.value === payload.intent) || contactIntents[0];
  const wait = waitOptions.find((item) => item.value === payload.wait) || waitOptions[0];
  const urgeLevel = normalizeUrgeLevel(payload.urgeLevel);
  const hasPracticalReason = payload.hasPracticalReason === true || intent.value === "practical";
  const safety = detectSafetyRisk(draft);
  const decision = buildDecision({
    intent: intent.value,
    urgeLevel,
    hasPracticalReason,
    wait: wait.value,
    safety
  });

  const record = {
    id: createLocalId("review-local"),
    intent: intent.value,
    intentText: intent.label,
    wait: wait.value,
    waitText: wait.label,
    urgeLevel,
    hasPracticalReason,
    draft,
    decision,
    hasSafetyRisk: safety.hasRisk,
    createdAt: new Date().toISOString()
  };

  const nextRecords = localStore.readArray(REVIEW_RECORDS_KEY);
  nextRecords.unshift(record);
  localStore.write(REVIEW_RECORDS_KEY, nextRecords);

  return Promise.resolve(clone(record));
}

function normalizeUrgeLevel(value) {
  const level = Number(value);
  return urgeLevels.includes(level) ? level : 3;
}

function buildDecision({ intent, urgeLevel, hasPracticalReason, wait, safety }) {
  if (safety.hasRisk) {
    return {
      level: "safety",
      title: "先处理安全，不做联系决策",
      summary: safety.notice,
      nextStep: "先联系现实中的可信赖支持或紧急救助渠道，再回来处理这段关系的问题。"
    };
  }

  if (!hasPracticalReason && urgeLevel >= 4) {
    return {
      level: "pause",
      title: "现在不建议立刻联系",
      summary: "这更像情绪峰值下的冲动联系，马上发出去容易让你更难收回边界。",
      nextStep: wait === "none" ? "先去急性期支持页撑过 10 分钟，再把草稿留到明天看。" : "把草稿保存下来，至少等情绪强度降到 3 分以下再判断。"
    };
  }

  if (hasPracticalReason || intent === "boundary") {
    return {
      level: "prepare",
      title: "可以准备，但先保持边界",
      summary: "如果确实有现实事务或边界需要确认，重点不是表达情绪，而是把信息写短、写清楚。",
      nextStep: "把消息压缩成 3 句：事实、请求、截止时间。写完后再等 10 分钟发送。"
    };
  }

  if (intent === "reconcile" || intent === "explain") {
    return {
      level: "review",
      title: "先复盘，再决定是否联系",
      summary: "解释、道歉或复合请求很容易把你重新带回关系拉扯。先确认你真正想得到的是回应、解释，还是结束感。",
      nextStep: "先写下：如果 TA 不回应，或者回应不符合期待，我能不能承受？"
    };
  }

  return {
    level: "wait",
    title: "先等一等，再做决定",
    summary: "现在还看不出必须马上联系的理由，可以先让冲动过去一点。",
    nextStep: "把草稿保存下来，做一件现实中的小事，晚一点再回来判断。"
  };
}

module.exports = {
  contactIntents,
  waitOptions,
  urgeLevels,
  getReviewRecords,
  createContactDecision
};
