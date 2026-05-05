const userService = require("../../services/userService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    user: null,
    joinedCommunities: [],
    myPosts: [],
    boundary: getApp().globalData.serviceBoundary
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadProfile();
    }
  },

  loadProfile() {
    Promise.all([
      userService.getCurrentUser(),
      userService.getJoinedCommunities(),
      userService.getMyPosts()
    ]).then(([user, joinedCommunities, myPosts]) => {
      this.setData({
        user,
        joinedCommunities,
        myPosts: myPosts.map((post) => ({
          ...post,
          relativeTime: formatRelativeTime(post.createdAt)
        })),
        loading: false
      });
    });
  },

  openCommunity(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/community/detail?id=${id}`
    });
  },

  openAgent() {
    wx.switchTab({
      url: "/pages/agent/index"
    });
  }
});
