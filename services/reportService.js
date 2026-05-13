const { createLocalId } = require("../utils/id");
const cloudApi = require("../utils/cloudApi");
const localStore = require("../utils/localStore");

const REPORTS_KEY = "heartbreakAlliance.reports";

const reportReasons = [
  { value: "unsafe", label: "涉及自伤或伤害他人" },
  { value: "harassment", label: "攻击、骚扰或羞辱" },
  { value: "privacy", label: "泄露隐私信息" },
  { value: "spam", label: "广告或无关内容" },
  { value: "other", label: "其他不适合公开内容" }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getReports() {
  return cloudApi.callData("listMyReports").then((cloudReports) => {
    return clone(cloudReports || []);
  }).catch(() => Promise.resolve(clone(localStore.readArray(REPORTS_KEY))));
}

function createReport(payload) {
  const targetType = ["post", "comment"].includes(payload.targetType) ? payload.targetType : "post";
  const targetId = String(payload.targetId || "").trim();
  const reason = reportReasons.find((item) => item.value === payload.reason) || reportReasons[reportReasons.length - 1];

  if (!targetId) {
    return Promise.reject(new Error("missing report target"));
  }

  const record = {
    id: createLocalId("report-local"),
    targetType,
    targetId,
    reason: reason.value,
    reasonText: reason.label,
    description: String(payload.description || "").trim().slice(0, 200),
    status: "pending",
    createdAt: new Date().toISOString()
  };

  return cloudApi.callData("createReport", { report: record }).then((cloudRecord) => {
    return clone(cloudRecord);
  }).catch(() => {
    const nextReports = localStore.readArray(REPORTS_KEY);
    nextReports.unshift(record);
    localStore.write(REPORTS_KEY, nextReports);
    return Promise.resolve(clone(record));
  });
}

module.exports = {
  reportReasons,
  getReports,
  createReport
};
