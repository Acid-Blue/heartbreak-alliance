const { createLocalId } = require("../utils/id");
const cloudApi = require("../utils/cloudApi");
const { detectSafetyRisk, isNightTime, nightSupportSteps } = require("./safetyService");
const localStore = require("../utils/localStore");

const URGE_RECORDS_KEY = "heartbreakAlliance.urgeRecords";
const SAFETY_PLAN_KEY = "heartbreakAlliance.safetyPlan";

const urgeReasons = [
  { value: "contact", label: "想联系 TA", prompt: "把想发出去的话先放在这里，不急着真的发。" },
  { value: "night", label: "深夜撑不住", prompt: "先把今晚最难受的一句话写下来。" },
  { value: "blame", label: "一直自责", prompt: "写下此刻最刺痛自己的那句话，我们先看见它。" },
  { value: "unsafe", label: "担心安全", prompt: "如果担心自己或他人的安全，先联系身边可信赖的人或紧急救助渠道。" }
];

const bufferSteps = [
  "把手机放到够不到的地方，先不打开聊天框。",
  "喝一口水，慢慢呼气 5 次，让身体先降一点速。",
  "把想发给 TA 的话写在这里，10 分钟后再决定要不要处理。",
  "如果还是很强烈，去找 Agent 说完整，或发到阵线小队里。"
];

const defaultSafetyPlan = {
  contactName: "",
  contactPhone: "",
  safePlace: "",
  groundingAction: "喝水、开灯、坐到门口或公共区域，慢慢呼气 5 次。"
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getUrgeRecords() {
  return cloudApi.callData("listUrgeRecords").then((cloudRecords) => {
    return clone(cloudRecords || []);
  }).catch(() => Promise.resolve(clone(localStore.readArray(URGE_RECORDS_KEY))));
}

function getSafetyPlan() {
  const fallback = readLocalSafetyPlan();
  return cloudApi.callData("getSetting", {
    key: SAFETY_PLAN_KEY,
    fallback
  }).then((plan) => {
    const normalized = normalizeSafetyPlan(plan);
    localStore.write(SAFETY_PLAN_KEY, normalized);
    return clone(normalized);
  }).catch(() => Promise.resolve(clone(fallback)));
}

function saveSafetyPlan(payload) {
  const plan = normalizeSafetyPlan(payload);
  localStore.write(SAFETY_PLAN_KEY, plan);
  return cloudApi.callData("setSetting", {
    key: SAFETY_PLAN_KEY,
    value: plan
  }).then(() => clone(plan)).catch(() => Promise.resolve(clone(plan)));
}

function readLocalSafetyPlan() {
  return normalizeSafetyPlan(localStore.read(SAFETY_PLAN_KEY, defaultSafetyPlan));
}

function normalizeSafetyPlan(value) {
  const plan = value || {};
  return {
    contactName: String(plan.contactName || "").trim().slice(0, 24),
    contactPhone: String(plan.contactPhone || "").replace(/[^\d+\-\s]/g, "").trim().slice(0, 24),
    safePlace: String(plan.safePlace || "").trim().slice(0, 60),
    groundingAction: String(plan.groundingAction || defaultSafetyPlan.groundingAction).trim().slice(0, 120)
  };
}

function createUrgeRecord(payload) {
  const reason = urgeReasons.find((item) => item.value === payload.reason) || urgeReasons[0];
  const draft = (payload.draft || "").trim();
  const safety = detectSafetyRisk(draft, reason.value);

  if (!draft) {
    return Promise.reject(new Error("empty urge draft"));
  }

  return getSafetyPlan().then((plan) => {
    const record = {
      id: createLocalId("urge-local"),
      reason: reason.value,
      reasonText: reason.label,
      draft,
      createdAt: new Date().toISOString(),
      delayMinutes: 10,
      isNightMode: reason.value === "night" || isNightTime(),
      hasSafetyRisk: safety.hasRisk,
      safetyNotice: safety.notice,
      safetyActions: safety.actions,
      supportContactName: plan.contactName,
      supportContactPhone: plan.contactPhone,
      safePlace: plan.safePlace,
      groundingAction: plan.groundingAction
    };

    return cloudApi.callData("createUrgeRecord", { record }).then((cloudRecord) => {
      return clone(cloudRecord);
    }).catch(() => {
      const nextRecords = localStore.readArray(URGE_RECORDS_KEY);
      nextRecords.unshift(record);
      localStore.write(URGE_RECORDS_KEY, nextRecords);
      return Promise.resolve(clone(record));
    });
  });
}

module.exports = {
  urgeReasons,
  bufferSteps,
  nightSupportSteps,
  defaultSafetyPlan,
  detectSafetyRisk,
  isNightTime,
  getSafetyPlan,
  saveSafetyPlan,
  getUrgeRecords,
  createUrgeRecord
};
