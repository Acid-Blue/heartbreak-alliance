const userService = require("../../services/userService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    user: null,
    profileStages: userService.profileStages,
    profileForm: {
      nickname: "",
      avatar: "阵",
      avatarUrl: "",
      bio: "",
      stage: "急性期"
    },
    joinedCommunities: [],
    myPosts: [],
    savingProfile: false,
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
        profileForm: this.toProfileForm(user),
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

  toProfileForm(user) {
    return {
      nickname: user.nickname || "匿名队友",
      avatar: user.avatar || "阵",
      avatarUrl: user.avatarUrl || "",
      bio: user.bio || "",
      stage: user.stage || "急性期"
    };
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

  loginWithWeChat() {
    if (this.data.savingProfile) return;

    this.setData({
      savingProfile: true
    });

    userService.loginWithWeChatProfile().then((profile) => {
      this.setData({
        user: {
          ...this.data.user,
          ...profile
        },
        profileForm: this.toProfileForm(profile),
        savingProfile: false
      });
      wx.showToast({
        title: "已登录",
        icon: "success"
      });
      this.loadProfile();
    }).catch(() => {
      this.setData({
        savingProfile: false
      });
      wx.showToast({
        title: "授权失败，可手动编辑",
        icon: "none"
      });
    });
  },

  onChooseAvatar(event) {
    const avatarUrl = event.detail.avatarUrl;

    if (!avatarUrl) return;

    this.setData({
      "profileForm.avatarUrl": avatarUrl
    });
  },

  onNicknameInput(event) {
    const nickname = event.detail.value;

    this.setData({
      "profileForm.nickname": nickname,
      "profileForm.avatar": (nickname || "阵").slice(0, 1)
    });
  },

  onBioInput(event) {
    this.setData({
      "profileForm.bio": event.detail.value
    });
  },

  chooseStage(event) {
    const { value } = event.currentTarget.dataset;
    this.setData({
      "profileForm.stage": value
    });
  },

  saveProfile() {
    const nickname = this.data.profileForm.nickname.trim();

    if (this.data.savingProfile) return;

    if (!nickname) {
      wx.showToast({
        title: "先填写昵称",
        icon: "none"
      });
      return;
    }

    this.setData({
      savingProfile: true
    });

    userService.updateUserProfile({
      ...this.data.profileForm,
      nickname,
      isProfileAuthorized: true
    }).then((profile) => {
      this.setData({
        user: {
          ...this.data.user,
          ...profile
        },
        profileForm: this.toProfileForm(profile),
        savingProfile: false
      });
      wx.showToast({
        title: "资料已保存",
        icon: "success"
      });
      this.loadProfile();
    }).catch(() => {
      this.setData({
        savingProfile: false
      });
      wx.showToast({
        title: "保存失败",
        icon: "none"
      });
    });
  },

  resetLocalProfile() {
    userService.logoutLocalProfile().then((profile) => {
      this.setData({
        user: {
          ...this.data.user,
          ...profile
        },
        profileForm: this.toProfileForm(profile)
      });
      wx.showToast({
        title: "已切回匿名资料",
        icon: "success"
      });
      this.loadProfile();
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
