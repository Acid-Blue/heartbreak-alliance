const userService = require("../../services/userService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    user: null,
    joinedCommunities: [],
    myPosts: [],
    savingPermission: false,
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
    this.setData({
      loading: true,
      error: ""
    });

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
    }).catch(() => {
      this.setData({
        error: "个人空间加载失败，请稍后再试",
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

  onPermissionChange(event) {
    const { key } = event.currentTarget.dataset;
    const value = event.detail.value;

    if (!key || this.data.savingPermission) return;

    this.setData({
      savingPermission: true
    });

    userService.updateAgentPermissions({
      [key]: value
    }).then((agentPermissions) => {
      this.setData({
        "user.agentPermissions": agentPermissions,
        "user.agentConsent": agentPermissions.ownContent || agentPermissions.publicCommunityContent,
        savingPermission: false
      });
      wx.showToast({
        title: "权限已更新",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        savingPermission: false
      });
      wx.showToast({
        title: "权限更新失败",
        icon: "none"
      });
      this.loadProfile();
    });
  }
});
