const supportService = require("../../services/supportService");

Page({
  data: {
    reasons: supportService.urgeReasons,
    bufferSteps: supportService.bufferSteps,
    selectedReason: "contact",
    selectedPrompt: supportService.urgeReasons[0].prompt,
    draft: "",
    safetyNotice: "",
    savedRecord: null,
    recordCount: 0,
    submitting: false,
    boundary: getApp().globalData.serviceBoundary
  },

  onLoad() {
    this.loadRecordCount();
  },

  loadRecordCount() {
    supportService.getUrgeRecords().then((records) => {
      this.setData({
        recordCount: records.length
      });
    });
  },

  chooseReason(event) {
    const { value } = event.currentTarget.dataset;
    const selected = this.data.reasons.find((item) => item.value === value) || this.data.reasons[0];

    this.setData({
      selectedReason: selected.value,
      selectedPrompt: selected.prompt,
      safetyNotice: this.getSafetyNotice(this.data.draft, selected.value)
    });
  },

  onDraftInput(event) {
    const draft = event.detail.value;
    this.setData({
      draft,
      safetyNotice: this.getSafetyNotice(draft, this.data.selectedReason)
    });
  },

  getSafetyNotice(draft, reason) {
    return supportService.detectSafetyRisk(draft, reason).notice;
  },

  saveUrge() {
    const draft = this.data.draft.trim();

    if (this.data.submitting) return;

    if (!draft) {
      wx.showToast({
        title: "先写下这股冲动",
        icon: "none"
      });
      return;
    }

    this.setData({
      submitting: true
    });

    supportService.createUrgeRecord({
      reason: this.data.selectedReason,
      draft
    }).then((record) => {
      this.setData({
        savedRecord: record,
        draft: "",
        safetyNotice: this.getSafetyNotice("", this.data.selectedReason),
        submitting: false,
        recordCount: this.data.recordCount + 1
      });
      wx.showToast({
        title: "已先存下",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        submitting: false
      });
      wx.showToast({
        title: "保存失败，请稍后再试",
        icon: "none"
      });
    });
  },

  openAgent() {
    wx.switchTab({
      url: "/pages/agent/index"
    });
  },

  openPublish() {
    wx.navigateTo({
      url: "/pages/publish/index?communityId=squad-001"
    });
  }
});
