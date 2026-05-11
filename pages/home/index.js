const communityService = require("../../services/communityService");
const postService = require("../../services/postService");
const userService = require("../../services/userService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    user: null,
    featuredCommunities: [],
    feed: [],
    boundary: getApp().globalData.serviceBoundary
  },

  onLoad() {
    this.loadHome();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadHome();
    }
  },

  loadHome() {
    this.setData({
      loading: true,
      error: ""
    });

    Promise.all([
      userService.getCurrentUser(),
      communityService.getFeaturedCommunities(),
      postService.getFeed()
    ]).then(([user, featuredCommunities, feed]) => {
      this.setData({
        user,
        featuredCommunities,
        feed: feed.map((post) => ({
          ...post,
          relativeTime: formatRelativeTime(post.createdAt)
        })),
        loading: false
      });
    }).catch(() => {
      this.setData({
        error: "内容加载失败，请稍后再试",
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

  openPost(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/post/detail?id=${id}`
    });
  },

  openAgent() {
    wx.switchTab({
      url: "/pages/agent/index"
    });
  },

  openSupport() {
    wx.navigateTo({
      url: "/pages/support/index"
    });
  },

  openPublish(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/publish/index?communityId=${id || "squad-001"}`
    });
  }
});
