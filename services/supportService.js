const { createLocalId } = require("../utils/id");
const localStore = require("../utils/localStore");

const URGE_RECORDS_KEY = "heartbreakAlliance.urgeRecords";

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getUrgeRecords() {
  return Promise.resolve(clone(localStore.readArray(URGE_RECORDS_KEY)));
}

function createUrgeRecord(payload) {
  const reason = urgeReasons.find((item) => item.value === payload.reason) || urgeReasons[0];
  const draft = (payload.draft || "").trim();

  if (!draft) {
    return Promise.reject(new Error("empty urge draft"));
  }

  const record = {
    id: createLocalId("urge-local"),
    reason: reason.value,
    reasonText: reason.label,
    draft,
    createdAt: new Date().toISOString(),
    delayMinutes: 10
  };

  const nextRecords = localStore.readArray(URGE_RECORDS_KEY);
  nextRecords.unshift(record);
  localStore.write(URGE_RECORDS_KEY, nextRecords);

  return Promise.resolve(clone(record));
}

module.exports = {
  urgeReasons,
  bufferSteps,
  getUrgeRecords,
  createUrgeRecord
};
