const communityService = require("../../services/communityService");

Page({
  data: {
    loading: true,
    communities: []
  },

  onLoad() {
    this.loadCommunities();
  },

  loadCommunities() {
    communityService.getCommunities().then((communities) => {
      this.setData({
        communities,
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
