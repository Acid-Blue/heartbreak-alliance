const { createLocalId } = require("../utils/id");
const cloudApi = require("../utils/cloudApi");
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

const relationshipPatterns = [
  {
    value: "pursueWithdraw",
    label: "追逐-回避",
    summary: "一方越想确认，另一方越退，最后双方都更紧绷。"
  },
  {
    value: "boundary",
    label: "边界反复",
    summary: "分开、复合、拉黑、解释之间来回切换，边界没有稳定下来。"
  },
  {
    value: "trust",
    label: "信任受损",
    summary: "核心问题不是一句话没说清，而是安全感和信任已经变弱。"
  },
  {
    value: "needMismatch",
    label: "需求错位",
    summary: "双方想要的关系节奏、投入方式或未来方向不一致。"
  },
  {
    value: "communication",
    label: "沟通失效",
    summary: "争执时更容易防御、解释或沉默，真正需求没有被听见。"
  }
];

const noContactDurations = [
  { value: "7", label: "7 天缓冲", days: 7 },
  { value: "14", label: "14 天观察", days: 14 },
  { value: "30", label: "30 天重建", days: 30 }
];

const riskWindows = [
  { value: "night", label: "夜里/睡前", action: "把手机放远，先写 3 句话到草稿，不打开聊天框。" },
  { value: "morning", label: "醒来后", action: "先完成洗漱和早餐，再判断冲动是否还在。" },
  { value: "weekend", label: "周末空下来", action: "提前安排一件离开屏幕的小事，减少反复查看动态。" },
  { value: "afterTrigger", label: "看到相关动态后", action: "立刻停止继续翻看，回到断联理由和替代动作。" }
];

const protectionActions = [
  { value: "mute", label: "消息免打扰" },
  { value: "hide", label: "隐藏聊天入口" },
  { value: "draftOnly", label: "只写草稿不发送" },
  { value: "askSupport", label: "先找可信赖的人" }
];

const actionFocusOptions = [
  { value: "boundary", label: "守住边界", taskHint: "减少查看动态，保留必要沟通边界。" },
  { value: "selfCare", label: "照顾身体", taskHint: "睡眠、饮食和洗漱先恢复一个基本动作。" },
  { value: "support", label: "连接支持", taskHint: "找一个可信赖的人或阵线小队说具体一点。" },
  { value: "logistics", label: "现实事务", taskHint: "把必须处理的物品、账单或工作交接写成清单。" }
];

const progressStates = [
  { value: "kept", label: "守住了" },
  { value: "wavered", label: "动摇但没发" },
  { value: "relapsed", label: "破戒了" },
  { value: "rebuild", label: "做了自己的事" }
];

const urgeLevels = [1, 2, 3, 4, 5];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getReviewRecords() {
  return cloudApi.callData("listReviewRecords").then((cloudRecords) => {
    return clone(cloudRecords || []);
  }).catch(() => Promise.resolve(clone(localStore.readArray(REVIEW_RECORDS_KEY))));
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
    kind: "contactDecision",
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

  return cloudApi.callData("createReviewRecord", { record }).then((cloudRecord) => {
    return clone(cloudRecord);
  }).catch(() => {
    return saveLocalRecord(record);
  });
}

function createRelationshipReview(payload) {
  const event = (payload.event || "").trim();
  const myNeed = (payload.myNeed || "").trim();

  if (!event || !myNeed) {
    return Promise.reject(new Error("empty relationship review"));
  }

  const pattern = relationshipPatterns.find((item) => item.value === payload.pattern) || relationshipPatterns[0];
  const review = {
    event,
    myNeed,
    taNeed: (payload.taNeed || "").trim(),
    responsibility: (payload.responsibility || "").trim(),
    evidenceFor: (payload.evidenceFor || "").trim(),
    evidenceAgainst: (payload.evidenceAgainst || "").trim(),
    lesson: (payload.lesson || "").trim()
  };
  const safety = detectSafetyRisk(Object.values(review).join(" "));
  const insight = buildRelationshipInsight({
    ...review,
    pattern,
    safety
  });

  const record = {
    id: createLocalId("review-local"),
    kind: "relationshipReview",
    pattern: pattern.value,
    patternText: pattern.label,
    ...review,
    insight,
    hasSafetyRisk: safety.hasRisk,
    createdAt: new Date().toISOString()
  };

  return cloudApi.callData("createReviewRecord", { record }).then((cloudRecord) => {
    return clone(cloudRecord);
  }).catch(() => saveLocalRecord(record));
}

function createNoContactPlan(payload) {
  const goal = (payload.goal || "").trim();
  const replacement = (payload.replacement || "").trim();

  if (!goal || !replacement) {
    return Promise.reject(new Error("empty no contact plan"));
  }

  const duration = noContactDurations.find((item) => item.value === payload.duration) || noContactDurations[1];
  const riskWindow = riskWindows.find((item) => item.value === payload.riskWindow) || riskWindows[0];
  const protectionAction = protectionActions.find((item) => item.value === payload.protectionAction) || protectionActions[0];
  const supportPerson = (payload.supportPerson || "").trim();
  const safety = detectSafetyRisk([goal, replacement, supportPerson].join(" "));
  const plan = buildNoContactPlan({
    duration,
    riskWindow,
    protectionAction,
    goal,
    replacement,
    supportPerson,
    safety
  });

  const record = {
    id: createLocalId("review-local"),
    kind: "noContactPlan",
    duration: duration.value,
    durationText: duration.label,
    days: duration.days,
    riskWindow: riskWindow.value,
    riskWindowText: riskWindow.label,
    protectionAction: protectionAction.value,
    protectionActionText: protectionAction.label,
    goal,
    replacement,
    supportPerson,
    plan,
    hasSafetyRisk: safety.hasRisk,
    createdAt: new Date().toISOString()
  };

  return cloudApi.callData("createReviewRecord", { record }).then((cloudRecord) => {
    return clone(cloudRecord);
  }).catch(() => saveLocalRecord(record));
}

function createActionPlan(payload) {
  const focus = actionFocusOptions.find((item) => item.value === payload.focus) || actionFocusOptions[0];
  const nextAction = (payload.nextAction || "").trim();
  const supportAction = (payload.supportAction || "").trim();
  const reviewAfterDays = normalizeReviewDays(payload.reviewAfterDays);
  const safety = detectSafetyRisk([nextAction, supportAction, payload.blocker || ""].join(" "));

  if (!nextAction) {
    return Promise.reject(new Error("empty action plan"));
  }

  const plan = buildActionPlan({
    focus,
    nextAction,
    supportAction,
    blocker: (payload.blocker || "").trim(),
    reviewAfterDays,
    safety
  });

  const record = {
    id: createLocalId("review-local"),
    kind: "actionPlan",
    focus: focus.value,
    focusText: focus.label,
    nextAction,
    supportAction,
    blocker: (payload.blocker || "").trim(),
    reviewAfterDays,
    plan,
    hasSafetyRisk: safety.hasRisk,
    createdAt: new Date().toISOString()
  };

  return cloudApi.callData("createReviewRecord", { record }).then((cloudRecord) => {
    return clone(cloudRecord);
  }).catch(() => saveLocalRecord(record));
}

function createProgressCheckin(payload) {
  const state = progressStates.find((item) => item.value === payload.state) || progressStates[0];
  const note = (payload.note || "").trim();
  const completedAction = (payload.completedAction || "").trim();
  const urgeLevel = normalizeUrgeLevel(payload.urgeLevel);
  const safety = detectSafetyRisk([note, completedAction].join(" "));

  if (!note && !completedAction) {
    return Promise.reject(new Error("empty progress checkin"));
  }

  const summary = buildProgressSummary({
    state,
    note,
    completedAction,
    urgeLevel,
    safety
  });

  const record = {
    id: createLocalId("review-local"),
    kind: "progressCheckin",
    state: state.value,
    stateText: state.label,
    note,
    completedAction,
    urgeLevel,
    summary,
    hasSafetyRisk: safety.hasRisk,
    createdAt: new Date().toISOString()
  };

  return cloudApi.callData("createReviewRecord", { record }).then((cloudRecord) => {
    return clone(cloudRecord);
  }).catch(() => saveLocalRecord(record));
}

function getActionDashboard() {
  return getReviewRecords().then((records) => {
    const sortedRecords = records.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const plans = sortedRecords.filter((record) => record.kind === "actionPlan" || record.kind === "noContactPlan").slice(0, 3);
    const checkins = sortedRecords.filter((record) => record.kind === "progressCheckin").slice(0, 5);

    return clone({
      plans,
      checkins,
      weeklyReview: buildWeeklyReview(sortedRecords)
    });
  });
}

function saveLocalRecord(record) {
  const nextRecords = localStore.readArray(REVIEW_RECORDS_KEY);
  nextRecords.unshift(record);
  localStore.write(REVIEW_RECORDS_KEY, nextRecords);
  return Promise.resolve(clone(record));
}

function normalizeUrgeLevel(value) {
  const level = Number(value);
  return urgeLevels.includes(level) ? level : 3;
}

function normalizeReviewDays(value) {
  const days = Number(value);
  return [1, 3, 7].includes(days) ? days : 3;
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

function buildRelationshipInsight({ pattern, event, myNeed, taNeed, responsibility, evidenceFor, evidenceAgainst, lesson, safety }) {
  if (safety.hasRisk) {
    return {
      level: "safety",
      title: "先处理安全，再复盘关系",
      summary: safety.notice,
      nextStep: "先联系现实中的可信赖支持或紧急救助渠道，等安全稳定后再回来处理这段关系。",
      questions: []
    };
  }

  const forScore = evidenceFor.length;
  const againstScore = evidenceAgainst.length;
  const hasClearLesson = lesson.length >= 8;
  const hasTaNeed = taNeed.length >= 6;
  const clarityScore = Math.min(100, 35
    + (event.length >= 12 ? 15 : 0)
    + (myNeed.length >= 8 ? 15 : 0)
    + (hasTaNeed ? 10 : 0)
    + (responsibility.length >= 8 ? 10 : 0)
    + (hasClearLesson ? 15 : 0));

  if (againstScore >= forScore && hasClearLesson) {
    return {
      level: "pause",
      title: "结论更偏向先保护边界",
      summary: `这次更像「${pattern.label}」模式：${pattern.summary} 目前不适合把稳定感交给一次联系来决定。清晰度 ${clarityScore}/100。`,
      nextStep: "先制定一份 7-14 天断联计划，把注意力从对方反应转回自己的生活秩序。",
      questions: [
        "如果 TA 不回应，我是否会更失控？",
        "这次联系是在解决现实问题，还是在寻求情绪止痛？"
      ]
    };
  }

  if (forScore > againstScore && responsibility.length >= 8) {
    return {
      level: "prepare",
      title: "可以准备沟通，但不要马上发送",
      summary: `你已经写出一些支持联系的证据，但模式仍接近「${pattern.label}」。联系前要把目的压缩到一个明确请求。清晰度 ${clarityScore}/100。`,
      nextStep: "先写三句话：事实、我的请求、对方可以拒绝的边界；至少等 24 小时再决定是否发送。",
      questions: [
        "这条消息有没有要求对方立刻安抚我？",
        "我能否接受对方不按期待回应？"
      ]
    };
  }

  return {
    level: "review",
    title: "先继续复盘，不急着下结论",
    summary: `当前核心模式是「${pattern.label}」：${pattern.summary} 信息还不足以支持立刻联系或彻底定性。清晰度 ${clarityScore}/100。`,
    nextStep: "补充一条具体证据：这段关系里同样的问题重复出现过几次？每次最后是谁承担后果？",
    questions: [
      "我真正需要的是解释、道歉、复合，还是结束感？",
      "这段关系有没有稳定满足我核心需求的能力？"
    ]
  };
}

function buildNoContactPlan({ duration, riskWindow, protectionAction, goal, replacement, supportPerson, safety }) {
  if (safety.hasRisk) {
    return {
      level: "safety",
      title: "先处理安全，不启动断联挑战",
      summary: safety.notice,
      startText: formatDate(new Date()),
      endText: formatDate(addDays(new Date(), duration.days)),
      rules: [
        "先离开可能伤害自己的物品或场景。",
        "联系现实中可信赖的人，或使用当地紧急救助渠道。",
        "等安全稳定后，再回来制定断联计划。"
      ],
      relapsePlan: "如果现在无法保证安全，把求助放在所有关系决策前面。"
    };
  }

  const startAt = new Date();
  const endAt = addDays(startAt, duration.days);
  const supportStep = supportPerson
    ? `冲动超过 4/5 时，先联系 ${supportPerson}，不要联系 TA。`
    : "冲动超过 4/5 时，先去 Agent 或急性期支持页，不联系 TA。";

  return {
    level: "plan",
    title: `执行 ${duration.label}`,
    summary: `目标：${goal}。最危险时段是${riskWindow.label}，先用「${protectionAction.label}」降低触发。`,
    startText: formatDate(startAt),
    endText: formatDate(endAt),
    rules: [
      "不主动发消息、不查看动态、不反复翻旧聊天记录。",
      `${riskWindow.label}出现冲动时：${riskWindow.action}`,
      `替代动作：${replacement}`,
      supportStep
    ],
    relapsePlan: "如果破戒了，不补发解释、不自责加码；记录触发点，重新从今天开始执行剩余计划。"
  };
}

function buildActionPlan({ focus, nextAction, supportAction, blocker, reviewAfterDays, safety }) {
  if (safety.hasRisk) {
    return {
      level: "safety",
      title: "先处理安全，再做行动计划",
      summary: safety.notice,
      tasks: safety.actions,
      reviewText: "等安全稳定后，再回来把计划拆小。"
    };
  }

  const tasks = [
    `今天只做一件事：${nextAction}`,
    supportAction ? `需要支持时：${supportAction}` : focus.taskHint,
    blocker ? `遇到阻碍时先处理：${blocker}` : "如果又想联系 TA，先把冲动写下来，等 10 分钟。"
  ];

  return {
    level: "plan",
    title: `${focus.label}行动计划`,
    summary: "这不是一次性解决关系问题，而是把今天能做的部分从情绪里拆出来。",
    tasks,
    reviewText: `${reviewAfterDays} 天后回来看一次：哪些动作真的帮到了你，哪些需要换掉。`
  };
}

function buildProgressSummary({ state, note, completedAction, urgeLevel, safety }) {
  if (safety.hasRisk) {
    return {
      level: "safety",
      title: "这次记录先转为安全提醒",
      summary: safety.notice,
      nextStep: "先联系现实中的可信赖支持或紧急救助渠道。"
    };
  }

  const actionText = completedAction ? `你完成了「${completedAction}」。` : "你记录了今天的状态。";

  if (state.value === "relapsed") {
    return {
      level: "pause",
      title: "破戒后先止损，不加码",
      summary: `${actionText} 冲动强度 ${urgeLevel}/5。破戒不等于失败，重点是停止补发解释和继续拉扯。`,
      nextStep: "写下触发点，重新从今天开始执行剩余计划。"
    };
  }

  return {
    level: "plan",
    title: `${state.label}，把证据留下`,
    summary: `${actionText} 冲动强度 ${urgeLevel}/5。${note ? `记录：${note}` : ""}`,
    nextStep: urgeLevel >= 4 ? "今晚优先去急性期支持页，不做联系决策。" : "保留这个有效动作，明天继续只做一件小事。"
  };
}

function buildWeeklyReview(records) {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const recentCheckins = records.filter((record) => {
    return record.kind === "progressCheckin" && now - new Date(record.createdAt).getTime() <= sevenDaysMs;
  });
  const keptCount = recentCheckins.filter((record) => record.state === "kept" || record.state === "wavered").length;
  const rebuildCount = recentCheckins.filter((record) => record.state === "rebuild").length;
  const relapseCount = recentCheckins.filter((record) => record.state === "relapsed").length;
  const urgeTotal = recentCheckins.reduce((sum, record) => sum + normalizeUrgeLevel(record.urgeLevel), 0);
  const avgUrge = recentCheckins.length > 0 ? Math.round((urgeTotal / recentCheckins.length) * 10) / 10 : 0;

  return {
    title: recentCheckins.length > 0 ? "最近 7 天有记录" : "还没有周期记录",
    summary: recentCheckins.length > 0
      ? `记录 ${recentCheckins.length} 次，守住或延迟 ${keptCount} 次，做回自己的事 ${rebuildCount} 次，破戒 ${relapseCount} 次，平均冲动 ${avgUrge}/5。`
      : "先完成一次行动计划或进度记录，周期回顾会自动生成。",
    nextStep: relapseCount > keptCount
      ? "下一步先降低触发：隐藏聊天入口、减少查看动态，并把支持联系人写清楚。"
      : "下一步保留有效动作，不扩大目标，只把最有用的一件事重复一次。",
    stats: {
      checkinCount: recentCheckins.length,
      keptCount,
      rebuildCount,
      relapseCount,
      avgUrge
    }
  };
}

function addDays(date, days) {
  const nextDate = new Date(date.getTime());
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = {
  contactIntents,
  waitOptions,
  relationshipPatterns,
  noContactDurations,
  riskWindows,
  protectionActions,
  actionFocusOptions,
  progressStates,
  urgeLevels,
  getReviewRecords,
  getActionDashboard,
  createContactDecision,
  createRelationshipReview,
  createNoContactPlan,
  createActionPlan,
  createProgressCheckin
};
