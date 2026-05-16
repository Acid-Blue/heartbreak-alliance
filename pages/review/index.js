const reviewService = require("../../services/reviewService");

Page({
  data: {
    modes: [
      { value: "decision", label: "联系判断" },
      { value: "relationship", label: "结构复盘" },
      { value: "noContact", label: "断联计划" },
      { value: "progress", label: "行动追踪" }
    ],
    activeMode: "decision",
    intents: reviewService.contactIntents,
    waitOptions: reviewService.waitOptions,
    urgeLevels: reviewService.urgeLevels,
    relationshipPatterns: reviewService.relationshipPatterns,
    noContactDurations: reviewService.noContactDurations,
    riskWindows: reviewService.riskWindows,
    protectionActions: reviewService.protectionActions,
    actionFocusOptions: reviewService.actionFocusOptions,
    progressStates: reviewService.progressStates,
    form: {
      intent: "impulse",
      wait: "none",
      urgeLevel: 4,
      hasPracticalReason: false,
      draft: ""
    },
    relationshipForm: {
      event: "",
      myNeed: "",
      taNeed: "",
      pattern: "pursueWithdraw",
      responsibility: "",
      evidenceFor: "",
      evidenceAgainst: "",
      lesson: ""
    },
    noContactForm: {
      duration: "14",
      riskWindow: "night",
      protectionAction: "mute",
      goal: "",
      replacement: "",
      supportPerson: ""
    },
    actionForm: {
      focus: "boundary",
      nextAction: "",
      supportAction: "",
      blocker: "",
      reviewAfterDays: 3
    },
    progressForm: {
      state: "kept",
      completedAction: "",
      note: "",
      urgeLevel: 3
    },
    result: null,
    relationshipResult: null,
    noContactResult: null,
    actionResult: null,
    progressResult: null,
    actionDashboard: null,
    recordCount: 0,
    submitting: false,
    boundary: getApp().globalData.serviceBoundary
  },

  onLoad() {
    this.loadRecordCount();
    this.loadActionDashboard();
  },

  loadRecordCount() {
    reviewService.getReviewRecords().then((records) => {
      this.setData({
        recordCount: records.length
      });
    });
  },

  loadActionDashboard() {
    reviewService.getActionDashboard().then((dashboard) => {
      this.setData({
        actionDashboard: dashboard
      });
    });
  },

  chooseMode(event) {
    this.setData({
      activeMode: event.currentTarget.dataset.value
    });
  },

  chooseIntent(event) {
    this.updateForm("intent", event.currentTarget.dataset.value);
  },

  chooseWait(event) {
    this.updateForm("wait", event.currentTarget.dataset.value);
  },

  chooseUrgeLevel(event) {
    this.updateForm("urgeLevel", Number(event.currentTarget.dataset.value));
  },

  onPracticalChange(event) {
    this.updateForm("hasPracticalReason", event.detail.value);
  },

  onDraftInput(event) {
    this.updateForm("draft", event.detail.value);
  },

  updateForm(key, value) {
    this.setData({
      [`form.${key}`]: value
    });
  },

  choosePattern(event) {
    this.updateRelationshipForm("pattern", event.currentTarget.dataset.value);
  },

  onRelationshipInput(event) {
    const { key } = event.currentTarget.dataset;
    this.updateRelationshipForm(key, event.detail.value);
  },

  updateRelationshipForm(key, value) {
    this.setData({
      [`relationshipForm.${key}`]: value
    });
  },

  chooseDuration(event) {
    this.updateNoContactForm("duration", event.currentTarget.dataset.value);
  },

  chooseRiskWindow(event) {
    this.updateNoContactForm("riskWindow", event.currentTarget.dataset.value);
  },

  chooseProtectionAction(event) {
    this.updateNoContactForm("protectionAction", event.currentTarget.dataset.value);
  },

  onNoContactInput(event) {
    const { key } = event.currentTarget.dataset;
    this.updateNoContactForm(key, event.detail.value);
  },

  updateNoContactForm(key, value) {
    this.setData({
      [`noContactForm.${key}`]: value
    });
  },

  chooseActionFocus(event) {
    this.updateActionForm("focus", event.currentTarget.dataset.value);
  },

  chooseReviewDays(event) {
    this.updateActionForm("reviewAfterDays", Number(event.currentTarget.dataset.value));
  },

  onActionInput(event) {
    const { key } = event.currentTarget.dataset;
    this.updateActionForm(key, event.detail.value);
  },

  updateActionForm(key, value) {
    this.setData({
      [`actionForm.${key}`]: value
    });
  },

  chooseProgressState(event) {
    this.updateProgressForm("state", event.currentTarget.dataset.value);
  },

  chooseProgressUrgeLevel(event) {
    this.updateProgressForm("urgeLevel", Number(event.currentTarget.dataset.value));
  },

  onProgressInput(event) {
    const { key } = event.currentTarget.dataset;
    this.updateProgressForm(key, event.detail.value);
  },

  updateProgressForm(key, value) {
    this.setData({
      [`progressForm.${key}`]: value
    });
  },

  submitDecision() {
    const draft = this.data.form.draft.trim();

    if (this.data.submitting) return;

    if (!draft) {
      wx.showToast({
        title: "先写下想联系的内容",
        icon: "none"
      });
      return;
    }

    this.setData({
      submitting: true
    });

    reviewService.createContactDecision({
      ...this.data.form,
      draft
    }).then((record) => {
      this.setData({
        result: record,
        submitting: false,
        recordCount: this.data.recordCount + 1
      });
      wx.showToast({
        title: "已生成建议",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        submitting: false
      });
      wx.showToast({
        title: "生成失败，请稍后再试",
        icon: "none"
      });
    });
  },

  submitRelationshipReview() {
    const event = this.data.relationshipForm.event.trim();
    const myNeed = this.data.relationshipForm.myNeed.trim();

    if (this.data.submitting) return;

    if (!event || !myNeed) {
      wx.showToast({
        title: "先写事件和需求",
        icon: "none"
      });
      return;
    }

    this.setData({
      submitting: true
    });

    reviewService.createRelationshipReview({
      ...this.data.relationshipForm,
      event,
      myNeed
    }).then((record) => {
      this.setData({
        relationshipResult: record,
        submitting: false,
        recordCount: this.data.recordCount + 1
      });
      wx.showToast({
        title: "复盘已生成",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        submitting: false
      });
      wx.showToast({
        title: "生成失败，请稍后再试",
        icon: "none"
      });
    });
  },

  submitNoContactPlan() {
    const goal = this.data.noContactForm.goal.trim();
    const replacement = this.data.noContactForm.replacement.trim();

    if (this.data.submitting) return;

    if (!goal || !replacement) {
      wx.showToast({
        title: "先写目标和替代动作",
        icon: "none"
      });
      return;
    }

    this.setData({
      submitting: true
    });

    reviewService.createNoContactPlan({
      ...this.data.noContactForm,
      goal,
      replacement
    }).then((record) => {
      this.setData({
        noContactResult: record,
        submitting: false,
        recordCount: this.data.recordCount + 1
      });
      this.loadActionDashboard();
      wx.showToast({
        title: "计划已生成",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        submitting: false
      });
      wx.showToast({
        title: "生成失败，请稍后再试",
        icon: "none"
      });
    });
  },

  submitActionPlan() {
    const nextAction = this.data.actionForm.nextAction.trim();

    if (this.data.submitting) return;

    if (!nextAction) {
      wx.showToast({
        title: "先写下一步动作",
        icon: "none"
      });
      return;
    }

    this.setData({
      submitting: true
    });

    reviewService.createActionPlan({
      ...this.data.actionForm,
      nextAction
    }).then((record) => {
      this.setData({
        actionResult: record,
        submitting: false,
        recordCount: this.data.recordCount + 1
      });
      this.loadActionDashboard();
      wx.showToast({
        title: "行动计划已生成",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        submitting: false
      });
      wx.showToast({
        title: "生成失败，请稍后再试",
        icon: "none"
      });
    });
  },

  submitProgressCheckin() {
    const note = this.data.progressForm.note.trim();
    const completedAction = this.data.progressForm.completedAction.trim();

    if (this.data.submitting) return;

    if (!note && !completedAction) {
      wx.showToast({
        title: "先写完成了什么",
        icon: "none"
      });
      return;
    }

    this.setData({
      submitting: true
    });

    reviewService.createProgressCheckin({
      ...this.data.progressForm,
      note,
      completedAction
    }).then((record) => {
      this.setData({
        progressResult: record,
        submitting: false,
        recordCount: this.data.recordCount + 1
      });
      this.loadActionDashboard();
      wx.showToast({
        title: "进度已记录",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        submitting: false
      });
      wx.showToast({
        title: "记录失败，请稍后再试",
        icon: "none"
      });
    });
  },

  openSupport() {
    wx.navigateTo({
      url: "/pages/support/index"
    });
  },

  openAgent() {
    wx.switchTab({
      url: "/pages/agent/index"
    });
  }
});
