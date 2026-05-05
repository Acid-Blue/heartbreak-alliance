const agentService = require("../../services/agentService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    messages: [],
    inputValue: "",
    sending: false,
    scrollIntoView: "",
    boundary: getApp().globalData.serviceBoundary
  },

  onLoad() {
    this.loadMessages();
  },

  loadMessages() {
    agentService.getAgentMessages().then((messages) => {
      this.setData({
        messages: this.decorateMessages(messages),
        loading: false
      }, this.scrollToBottom);
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
      this.setData({ sending: false });
      wx.showToast({
        title: "Agent 暂时没回应",
        icon: "none"
      });
    });
  },

  scrollToBottom() {
    const last = this.data.messages[this.data.messages.length - 1];
    if (last) {
      this.setData({
        scrollIntoView: last.id
      });
    }
  }
});
