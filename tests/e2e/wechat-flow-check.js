const assert = require("assert");
const automator = require("miniprogram-automator");

const cliPath = process.env.WECHAT_DEVTOOLS_CLI || "/Applications/wechatwebdevtools.app/Contents/MacOS/cli";
const projectPath = process.cwd();
const port = Number(process.env.WECHAT_AUTOMATOR_PORT || 52634);

function event(dataset, detail) {
  return {
    currentTarget: {
      dataset: dataset || {}
    },
    detail: detail || {}
  };
}

async function waitFor(condition, label, timeoutMs = 5000) {
  const startedAt = Date.now();
  let lastValue;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await condition();
    if (lastValue) {
      return lastValue;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${label}; last value: ${JSON.stringify(lastValue)}`);
}

async function main() {
  const miniProgram = await openMiniProgram();

  try {
    await miniProgram.callWxMethod("clearStorageSync");
    await miniProgram.mockWxMethod("showToast", function(options) {
      if (options && options.success) options.success({});
    });
    await miniProgram.mockWxMethod("showActionSheet", function(options) {
      if (options && options.success) options.success({ tapIndex: 1 });
    });
    await miniProgram.mockWxMethod("makePhoneCall", function(options) {
      if (options && options.success) options.success({});
    });

    await checkSupportFlow(miniProgram);
    await checkReviewProgressFlow(miniProgram);
    await checkCommunityCheckinFlow(miniProgram);
    await checkPublishModerationFlow(miniProgram);
    await checkProfileRebuildFlow(miniProgram);
    await checkReportModerationFlow(miniProgram);

    console.log("wechat e2e checks passed");
  } finally {
    await miniProgram.close();
  }
}

async function openMiniProgram() {
  try {
    return await automator.launch({
      cliPath,
      projectPath,
      port,
      timeout: 90000,
      trustProject: true
    });
  } catch (error) {
    console.warn(`[wechat e2e] launch failed, trying existing automation port ${port}: ${error.message}`);
    return automator.connect({
      wsEndpoint: `ws://127.0.0.1:${port}`
    });
  }
}

async function checkSupportFlow(miniProgram) {
  const page = await miniProgram.reLaunch("/pages/support/index");
  await page.waitFor(800);

  await page.setData({
    safetyPlanForm: {
      contactName: "E2E 安全联系人",
      contactPhone: "10086",
      safePlace: "客厅",
      groundingAction: "开灯喝水，坐到门口。"
    }
  });
  await page.callMethod("saveSafetyPlan");
  await page.waitFor(300);
  await page.callMethod("chooseReason", event({ value: "night" }));
  await page.callMethod("onDraftInput", event({}, { value: "今晚很想联系 TA，但先存下来。" }));
  await page.callMethod("saveUrge");

  await waitFor(async () => {
    const data = await page.data();
    return data.recordCount >= 1 && data.recentRecords.length >= 1 && data.safetyPlan.contactName === "E2E 安全联系人";
  }, "support flow");
}

async function checkReviewProgressFlow(miniProgram) {
  const page = await miniProgram.reLaunch("/pages/review/index");
  await page.waitFor(800);

  await page.callMethod("chooseMode", event({ value: "progress" }));
  await page.setData({
    actionForm: {
      focus: "boundary",
      nextAction: "今晚不看旧聊天记录",
      supportAction: "想联系时先去急性期支持页",
      blocker: "睡前容易翻旧动态",
      reviewAfterDays: 3
    }
  });
  await page.callMethod("submitActionPlan");

  await waitFor(async () => {
    const data = await page.data();
    return data.actionResult && data.actionResult.kind === "actionPlan";
  }, "action plan");

  await page.setData({
    progressForm: {
      state: "kept",
      completedAction: "睡前没有打开聊天框",
      note: "冲动降下来了",
      urgeLevel: 2
    }
  });
  await page.callMethod("submitProgressCheckin");

  await waitFor(async () => {
    const data = await page.data();
    return data.progressResult
      && data.progressResult.kind === "progressCheckin"
      && data.actionDashboard
      && data.actionDashboard.weeklyReview.stats.checkinCount >= 1;
  }, "progress checkin");
}

async function checkCommunityCheckinFlow(miniProgram) {
  const page = await miniProgram.reLaunch("/pages/community/detail?id=squad-003");
  await page.waitFor(800);

  await page.callMethod("onCheckinInput", event({}, { value: "E2E 打卡：今晚先把手机放远。" }));
  await page.callMethod("submitCheckin");

  await waitFor(async () => {
    const data = await page.data();
    return data.checkins.length >= 1 && data.checkins[0].content.includes("E2E 打卡");
  }, "community checkin");
}

async function checkPublishModerationFlow(miniProgram) {
  const page = await miniProgram.reLaunch("/pages/publish/index?communityId=squad-001");
  await page.waitFor(800);

  await page.callMethod("onContentInput", event({}, { value: "E2E 内容提示：手机号 13800000000 不应公开。" }));
  let data = await page.data();
  assert(data.contentNotice, "publish moderation notice should be visible");

  await page.callMethod("submitPost");
  await waitFor(async () => {
    data = await page.data();
    return data.contentNotice && data.contentNotice.length > 0;
  }, "publish review notice");
}

async function checkProfileRebuildFlow(miniProgram) {
  const page = await miniProgram.switchTab("/pages/profile/index");
  await page.waitFor(1000);

  await page.callMethod("toggleRebuildTask", event({ id: "sleep" }));
  await page.callMethod("toggleRebuildTask", event({ id: "meal" }));
  await page.setData({
    rebuildNote: "E2E 今天先恢复作息。",
    rebuildMoodLevel: 3,
    rebuildUrgeLevel: 2
  });
  await page.callMethod("saveRebuildPlan");
  await waitFor(async () => {
    const data = await page.data();
    return data.recentRebuildRecords.some((record) => record.kind === "dailyPlan");
  }, "rebuild plan");

  await page.callMethod("saveRebuildProgress");
  await waitFor(async () => {
    const data = await page.data();
    return data.rebuildSummary.entryCount >= 1
      && data.recentRebuildRecords.some((record) => record.kind === "progressEntry");
  }, "rebuild progress");
}

async function checkReportModerationFlow(miniProgram) {
  const postPage = await miniProgram.reLaunch("/pages/post/detail?id=post-002");
  await postPage.waitFor(800);
  await postPage.callMethod("submitReport", {
    targetType: "post",
    targetId: "post-002",
    reason: "harassment"
  });
  await postPage.waitFor(800);

  const page = await miniProgram.reLaunch("/pages/moderation/index");
  await page.waitFor(800);

  const report = await waitFor(async () => {
    const data = await page.data();
    return data.reports[0];
  }, "moderation report");

  assert.strictEqual(report.status, "pending");
  await page.callMethod("markReport", event({ id: report.id, status: "resolved" }));

  await waitFor(async () => {
    const data = await page.data();
    return data.reports[0] && data.reports[0].status === "resolved";
  }, "moderation status update");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
