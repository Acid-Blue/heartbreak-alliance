const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const ignoredDirs = new Set([".git", "node_modules", "miniprogram_npm"]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        files.push(...walk(path.join(dir, entry.name)));
      }
      continue;
    }

    files.push(path.join(dir, entry.name));
  }

  return files;
}

function relative(file) {
  return path.relative(root, file);
}

function checkJavaScriptSyntax(files) {
  const jsFiles = files.filter((file) => file.endsWith(".js"));

  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ["--check", relative(file)], {
      cwd: root,
      encoding: "utf8"
    });

    assert.strictEqual(result.status, 0, result.stderr || `${relative(file)} failed syntax check`);
  }
}

function checkJson(files) {
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  for (const file of jsonFiles) {
    JSON.parse(fs.readFileSync(file, "utf8"));
  }
}

function checkMiniProgramFiles() {
  const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
  const missing = [];

  for (const page of app.pages) {
    for (const ext of ["js", "json", "wxml", "wxss"]) {
      const target = path.join(root, `${page}.${ext}`);
      if (!fs.existsSync(target)) {
        missing.push(`${page}.${ext}`);
      }
    }
  }

  for (const item of app.tabBar.list) {
    for (const key of ["iconPath", "selectedIconPath"]) {
      if (!fs.existsSync(path.join(root, item[key]))) {
        missing.push(item[key]);
      }
    }
  }

  assert.deepStrictEqual(missing, []);
}

async function checkServices() {
  const communityService = require("../services/communityService");
  const postService = require("../services/postService");
  const rebuildService = require("../services/rebuildService");
  const reportService = require("../services/reportService");
  const reviewService = require("../services/reviewService");
  const supportService = require("../services/supportService");
  const userService = require("../services/userService");

  await userService.logoutLocalProfile();

  const searchResults = await communityService.searchCommunities("晚安");
  assert(searchResults.some((community) => community.id === "squad-003"));
  assert(searchResults.every((community) => Array.isArray(community.stageTags)));

  let community = await communityService.getCommunity("squad-003");
  assert.strictEqual(community.isJoined, false);

  community = await communityService.joinCommunity("squad-003");
  assert.strictEqual(community.isJoined, true);

  community = await communityService.leaveCommunity("squad-003");
  assert.strictEqual(community.isJoined, false);

  const checkin = await communityService.createCommunityCheckin({
    communityId: "squad-003",
    content: "自动化测试阶段打卡"
  });
  assert.strictEqual(checkin.communityId, "squad-003");

  await userService.updateUserProfile({
    nickname: "测试队友",
    avatar: "测",
    stage: "复盘期",
    isProfileAuthorized: true
  });

  const post = await postService.createPost({
    communityId: "squad-001",
    type: "vent",
    emotion: "反复想联系",
    content: "自动化测试公开帖",
    visibility: "小队可见"
  });
  assert.strictEqual(post.authorName, "测试队友");

  const commentResult = await postService.createComment({
    postId: post.id,
    content: "自动化测试回应"
  });
  assert.strictEqual(commentResult.comment.authorName, "测试队友");

  const report = await reportService.createReport({
    targetType: "post",
    targetId: post.id,
    reason: "harassment"
  });
  assert.strictEqual(report.status, "pending");
  assert.strictEqual(report.targetId, post.id);
  const hiddenTargets = reportService.getLocalHiddenTargets();
  assert(hiddenTargets.posts.includes(post.id));
  const updatedReport = await reportService.updateReportStatus(report.id, "resolved");
  assert.strictEqual(updatedReport.status, "resolved");

  const reviewedPost = await postService.createPost({
    communityId: "squad-001",
    type: "vent",
    emotion: "委屈",
    content: "手机号 13800000000 自动化测试",
    visibility: "小队可见"
  });
  assert.strictEqual(reviewedPost.moderationStatus, "review");

  const urge = await supportService.createUrgeRecord({
    reason: "contact",
    draft: "我现在很想联系 TA，但先存下来。"
  });
  assert.strictEqual(urge.reasonText, "想联系 TA");

  const safetyPlan = await supportService.saveSafetyPlan({
    contactName: "安全联系人",
    contactPhone: "10086",
    safePlace: "客厅",
    groundingAction: "开灯喝水"
  });
  assert.strictEqual(safetyPlan.contactName, "安全联系人");

  const review = await reviewService.createRelationshipReview({
    event: "争吵后我连续追问，对方一直不回应，我更想确认关系。",
    myNeed: "我需要确定感和清楚边界。",
    pattern: "pursueWithdraw",
    evidenceAgainst: "多次冷处理。",
    lesson: "我需要更早确认沟通方式。"
  });
  assert.strictEqual(review.kind, "relationshipReview");

  const plan = await reviewService.createNoContactPlan({
    duration: "14",
    riskWindow: "night",
    protectionAction: "mute",
    goal: "让情绪先降下来。",
    replacement: "夜里先写草稿，再去 Agent 说。"
  });
  assert.strictEqual(plan.kind, "noContactPlan");

  const actionPlan = await reviewService.createActionPlan({
    focus: "boundary",
    nextAction: "今晚不看旧聊天",
    supportAction: "想联系时先去小队写下来",
    reviewAfterDays: 3
  });
  assert.strictEqual(actionPlan.kind, "actionPlan");

  const progress = await reviewService.createProgressCheckin({
    state: "kept",
    completedAction: "睡前没有打开聊天框",
    note: "冲动过了一阵",
    urgeLevel: 2
  });
  assert.strictEqual(progress.kind, "progressCheckin");

  const dashboard = await reviewService.getActionDashboard();
  assert(dashboard.weeklyReview.stats.checkinCount >= 1);

  const rebuildPlan = await rebuildService.createDailyPlan({
    taskIds: ["sleep", "meal"],
    note: "今天先把身体照顾住。"
  });
  assert.strictEqual(rebuildPlan.kind, "dailyPlan");

  const rebuildProgress = await rebuildService.createProgressEntry({
    taskIds: ["sleep"],
    moodLevel: 3,
    urgeLevel: 2,
    note: "睡前放下手机。"
  });
  assert.strictEqual(rebuildProgress.kind, "progressEntry");

  const rebuildSummary = await rebuildService.getProgressSummary();
  assert(rebuildSummary.summary.entryCount >= 1);

  await userService.logoutLocalProfile();
}

async function main() {
  const files = walk(root);

  checkJavaScriptSyntax(files);
  checkJson(files);
  checkMiniProgramFiles();
  await checkServices();

  console.log("all checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
