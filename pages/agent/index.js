const agentService = require("../../services/agentService");
const userService = require("../../services/userService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    messages: [],
    inputValue: "",
    sending: false,
    scrollIntoView: "",
    contextSummary: "",
    boundary: getApp().globalData.serviceBoundary
  },

  onLoad() {
    this.loadMessages();
  },

  onShow() {
    this.loadContextStatus();
  },

  loadMessages() {
    this.setData({
      loading: true,
      error: ""
    });

    Promise.all([
      agentService.getAgentMessages(),
      this.getContextSummary()
    ]).then(([messages, contextSummary]) => {
      this.setData({
        messages: this.decorateMessages(messages),
        contextSummary,
        loading: false
      }, this.scrollToBottom);
    }).catch(() => {
      this.setData({
        error: "Agent 内容加载失败，请稍后再试",
        loading: false
      });
    });
  },

  loadContextStatus() {
    this.getContextSummary().then((contextSummary) => {
      this.setData({
        contextSummary
      });
    });
  },

  getContextSummary() {
    return userService.getCurrentUser().then((user) => {
      const permissions = user.agentPermissions || {};

      if (permissions.ownContent && permissions.publicCommunityContent) {
        return "会参考你的发布、回应和阵线小队公开内容，帮你整理情绪线索。";
      }

      if (permissions.ownContent) {
        return "当前只参考你的发布和回应，不参考小队公开内容。";
      }

      if (permissions.publicCommunityContent) {
        return "当前只参考阵线小队公开内容，不参考你的个人发布和回应。";
      }

      return "已关闭上下文参考，Agent 只基于本次输入回应。";
    });
  },

  decorateMessages(messages) {
    return messages.map((message) => ({
      ...message,
      relativeTime: formatRelativeTime(message.createdAt)
    }));
  },

  onInput(event) {
    this.setData({
      inputValue: event.detail.value
    });
  },

  sendMessage() {
    const content = this.data.inputValue.trim();

    if (!content || this.data.sending) return;

    this.setData({
      sending: true,
      inputValue: ""
    });

    agentService.sendAgentMessage({ content }).then(({ userMessage, reply }) => {
      const nextMessages = this.data.messages.concat(this.decorateMessages([userMessage, reply]));
      this.setData({
        messages: nextMessages,
        sending: false
      }, this.scrollToBottom);
    }).catch(() => {
      this.setData({
        inputValue: content,
        sending: false
      });
      wx.showToast({
        title: "Agent 暂时没回应",
        icon: "none"
      });
    });
  },

  openSupport() {
    wx.navigateTo({
      url: "/pages/support/index"
    });
  },

  scrollToBottom() {
    if (this.data.messages.length > 0) {
      this.setData({
        scrollIntoView: ""
      });
      wx.nextTick(() => {
        this.setData({
          scrollIntoView: "message-bottom"
        });
      });
    }
  }
});
