const communityService = require("../../services/communityService");

Page({
  data: {
    loading: true,
    error: "",
    communities: []
  },

  onLoad() {
    this.loadCommunities();
  },

  loadCommunities() {
    this.setData({
      loading: true,
      error: ""
    });

    communityService.getCommunities().then((communities) => {
      this.setData({
        communities,
        loading: false
      });
    }).catch(() => {
      this.setData({
        error: "小队加载失败，请稍后再试",
        loading: false
      });
    });
  },

  openCommunity(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/community/detail?id=${id}`
    });
  }
});
