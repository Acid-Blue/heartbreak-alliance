const reviewService = require("../../services/reviewService");

Page({
  data: {
    intents: reviewService.contactIntents,
    waitOptions: reviewService.waitOptions,
    urgeLevels: reviewService.urgeLevels,
    form: {
      intent: "impulse",
      wait: "none",
      urgeLevel: 4,
      hasPracticalReason: false,
      draft: ""
    },
    result: null,
    recordCount: 0,
    submitting: false,
    boundary: getApp().globalData.serviceBoundary
  },

  onLoad() {
    this.loadRecordCount();
  },

  loadRecordCount() {
    reviewService.getReviewRecords().then((records) => {
      this.setData({
        recordCount: records.length
      });
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
