const communityService = require("../../services/communityService");

Page({
  data: {
    loading: true,
    error: "",
    query: "",
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

    communityService.searchCommunities(this.data.query).then((communities) => {
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

  onSearchInput(event) {
    const query = event.detail.value;

    this.setData({
      query
    });

    communityService.searchCommunities(query).then((communities) => {
      this.setData({
        communities
      });
    });
  },

  clearSearch() {
    this.setData({
      query: ""
    });
    this.loadCommunities();
  },

  toggleJoin(event) {
    const { id } = event.currentTarget.dataset;
    const joined = event.currentTarget.dataset.joined === "1";
    const nextAction = joined ? communityService.leaveCommunity : communityService.joinCommunity;

    nextAction(id).then(() => {
      wx.showToast({
        title: joined ? "已退出小队" : "已加入小队",
        icon: "success"
      });
      this.loadCommunities();
    }).catch(() => {
      wx.showToast({
        title: "操作失败",
        icon: "none"
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
