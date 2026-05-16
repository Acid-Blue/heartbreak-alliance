const { createLocalId } = require("../utils/id");
const cloudApi = require("../utils/cloudApi");
const localStore = require("../utils/localStore");

const REBUILD_RECORDS_KEY = "heartbreakAlliance.rebuildRecords";

const rebuildTaskOptions = [
  { id: "sleep", label: "睡前放下手机 20 分钟", category: "睡眠" },
  { id: "meal", label: "认真吃一顿饭", category: "饮食" },
  { id: "movement", label: "出门走 10 分钟", category: "运动" },
  { id: "tidy", label: "整理一个小角落", category: "整理" },
  { id: "interest", label: "做 15 分钟兴趣小事", category: "兴趣" },
  { id: "social", label: "联系一个安全的人", category: "社交" },
  { id: "focus", label: "完成一个工作/学习小块", category: "工作学习" }
];

const levelOptions = [1, 2, 3, 4, 5];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getRebuildRecords() {
  return cloudApi.callData("listRebuildRecords").then((cloudRecords) => {
    return clone(cloudRecords || []);
  }).catch(() => Promise.resolve(clone(localStore.readArray(REBUILD_RECORDS_KEY))));
}

function createDailyPlan(payload) {
  const tasks = normalizeTasks(payload.taskIds);
  const note = String(payload.note || "").trim().slice(0, 160);

  if (tasks.length === 0) {
    return Promise.reject(new Error("empty rebuild plan"));
  }

  const record = {
    id: createLocalId("rebuild-local"),
    kind: "dailyPlan",
    tasks,
    note,
    createdAt: new Date().toISOString()
  };

  return saveRecord(record);
}

function createProgressEntry(payload) {
  const tasks = normalizeTasks(payload.taskIds);
  const moodLevel = normalizeLevel(payload.moodLevel);
  const urgeLevel = normalizeLevel(payload.urgeLevel);
  const note = String(payload.note || "").trim().slice(0, 180);

  if (tasks.length === 0 && !note) {
    return Promise.reject(new Error("empty rebuild progress"));
  }

  const record = {
    id: createLocalId("rebuild-local"),
    kind: "progressEntry",
    tasks,
    moodLevel,
    urgeLevel,
    note,
    summary: buildProgressText({ tasks, moodLevel, urgeLevel, note }),
    createdAt: new Date().toISOString()
  };

  return saveRecord(record);
}

function getProgressSummary() {
  return getRebuildRecords().then((records) => {
    const sortedRecords = records.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return clone({
      records: sortedRecords.slice(0, 5),
      summary: buildSummary(sortedRecords)
    });
  });
}

function saveRecord(record) {
  return cloudApi.callData("createRebuildRecord", { record }).then((cloudRecord) => {
    return clone(cloudRecord);
  }).catch(() => {
    const records = localStore.readArray(REBUILD_RECORDS_KEY);
    records.unshift(record);
    localStore.write(REBUILD_RECORDS_KEY, records);
    return Promise.resolve(clone(record));
  });
}

function normalizeTasks(taskIds) {
  const ids = Array.isArray(taskIds) ? taskIds : [];
  const selected = rebuildTaskOptions.filter((task) => ids.includes(task.id)).slice(0, 3);
  return selected.map((task) => ({
    id: task.id,
    label: task.label,
    category: task.category
  }));
}

function normalizeLevel(value) {
  const level = Number(value);
  return levelOptions.includes(level) ? level : 3;
}

function buildProgressText({ tasks, moodLevel, urgeLevel, note }) {
  const taskText = tasks.length > 0 ? tasks.map((task) => task.label).join("、") : "记录了一点状态";
  const urgeText = urgeLevel >= 4 ? "联系冲动偏高，今晚先缩小目标。" : "联系冲动还能被看见和放下。";
  return `完成：${taskText}。情绪 ${moodLevel}/5，联系冲动 ${urgeLevel}/5。${urgeText}${note ? ` 备注：${note}` : ""}`;
}

function buildSummary(records) {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const recentEntries = records.filter((record) => {
    return record.kind === "progressEntry" && now - new Date(record.createdAt).getTime() <= sevenDaysMs;
  });
  const completedTaskCount = recentEntries.reduce((sum, record) => sum + (record.tasks || []).length, 0);
  const moodTotal = recentEntries.reduce((sum, record) => sum + normalizeLevel(record.moodLevel), 0);
  const urgeTotal = recentEntries.reduce((sum, record) => sum + normalizeLevel(record.urgeLevel), 0);

  return {
    title: recentEntries.length > 0 ? "最近 7 天恢复记录" : "今天先选 1-3 个小步",
    summary: recentEntries.length > 0
      ? `记录 ${recentEntries.length} 次，完成 ${completedTaskCount} 个小动作，平均情绪 ${roundOne(moodTotal / recentEntries.length)}/5，平均联系冲动 ${roundOne(urgeTotal / recentEntries.length)}/5。`
      : "恢复不是证明自己已经好了，而是让生活重新有一点可执行的顺序。",
    nextStep: recentEntries.length > 0
      ? "保留最容易完成的一项，明天重复它。"
      : "不要一次选太多，先从睡眠、吃饭、出门或整理里选一件。",
    completedTaskCount,
    entryCount: recentEntries.length
  };
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

module.exports = {
  rebuildTaskOptions,
  levelOptions,
  getRebuildRecords,
  getProgressSummary,
  createDailyPlan,
  createProgressEntry
};
