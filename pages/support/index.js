const supportService = require("../../services/supportService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    reasons: supportService.urgeReasons,
    bufferSteps: supportService.bufferSteps,
    nightSteps: supportService.nightSupportSteps,
    selectedReason: "contact",
    selectedPrompt: supportService.urgeReasons[0].prompt,
    draft: "",
    safetyNotice: "",
    isNightMode: supportService.isNightTime(),
    safetyPlan: supportService.defaultSafetyPlan,
    safetyPlanForm: supportService.defaultSafetyPlan,
    savedRecord: null,
    recentRecords: [],
    openedRecordId: "",
    recordCount: 0,
    submitting: false,
    savingSafetyPlan: false,
    boundary: getApp().globalData.serviceBoundary
  },

  onLoad() {
    this.loadSafetyPlan();
    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  loadRecords() {
    supportService.getUrgeRecords().then((records) => {
      const recentRecords = records.slice(0, 5).map((record) => ({
        ...record,
        relativeTime: formatRelativeTime(record.createdAt),
        preview: this.formatPreview(record.draft)
      }));

      this.setData({
        recordCount: records.length,
        recentRecords
      });
    });
  },

  loadSafetyPlan() {
    supportService.getSafetyPlan().then((plan) => {
      this.setData({
        safetyPlan: plan,
        safetyPlanForm: plan
      });
    });
  },

  formatPreview(value) {
    const text = value || "";
    return text.length > 36 ? `${text.slice(0, 36)}...` : text;
  },

  chooseReason(event) {
    const { value } = event.currentTarget.dataset;
    const selected = this.data.reasons.find((item) => item.value === value) || this.data.reasons[0];

    this.setData({
      selectedReason: selected.value,
      selectedPrompt: selected.prompt,
      isNightMode: selected.value === "night" || supportService.isNightTime(),
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

  onSafetyPlanInput(event) {
    const { key } = event.currentTarget.dataset;
    this.setData({
      [`safetyPlanForm.${key}`]: event.detail.value
    });
  },

  saveSafetyPlan() {
    if (this.data.savingSafetyPlan) return;

    this.setData({
      savingSafetyPlan: true
    });

    supportService.saveSafetyPlan(this.data.safetyPlanForm).then((plan) => {
      this.setData({
        safetyPlan: plan,
        safetyPlanForm: plan,
        savingSafetyPlan: false
      });
      wx.showToast({
        title: "安全计划已保存",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        savingSafetyPlan: false
      });
      wx.showToast({
        title: "保存失败",
        icon: "none"
      });
    });
  },

  callSafetyContact() {
    const phone = this.data.safetyPlan.contactPhone;

    if (!phone) {
      wx.showToast({
        title: "先填写联系人电话",
        icon: "none"
      });
      return;
    }

    wx.makePhoneCall({
      phoneNumber: phone
    });
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
        recordCount: this.data.recordCount + 1,
        openedRecordId: record.id
      });
      this.loadRecords();
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

  toggleRecord(event) {
    const { id } = event.currentTarget.dataset;

    this.setData({
      openedRecordId: this.data.openedRecordId === id ? "" : id
    });
  },

  openAgent() {
    wx.switchTab({
      url: "/pages/agent/index"
    });
  },

  openReview() {
    wx.navigateTo({
      url: "/pages/review/index"
    });
  },

  openPublish() {
    wx.navigateTo({
      url: "/pages/publish/index?communityId=squad-001"
    });
  }
});
