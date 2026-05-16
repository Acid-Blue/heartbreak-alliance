const userService = require("../../services/userService");
const rebuildService = require("../../services/rebuildService");
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
    rebuildTaskOptions: rebuildService.rebuildTaskOptions.map((task) => ({
      ...task,
      selected: false
    })),
    rebuildLevelOptions: rebuildService.levelOptions,
    selectedRebuildTaskIds: [],
    rebuildNote: "",
    rebuildMoodLevel: 3,
    rebuildUrgeLevel: 3,
    rebuildSummary: {
      title: "今天先选 1-3 个小步",
      summary: "恢复不是证明自己已经好了，而是让生活重新有一点可执行的顺序。",
      nextStep: "不要一次选太多，先从睡眠、吃饭、出门或整理里选一件。",
      entryCount: 0
    },
    recentRebuildRecords: [],
    savingRebuild: false,
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
      userService.getMyPosts(),
      rebuildService.getProgressSummary()
    ]).then(([user, joinedCommunities, myPosts, rebuildProgress]) => {
      this.setData({
        user,
        profileForm: this.toProfileForm(user),
        joinedCommunities,
        myPosts: myPosts.map((post) => ({
          ...post,
          relativeTime: formatRelativeTime(post.createdAt)
        })),
        rebuildSummary: rebuildProgress.summary,
        recentRebuildRecords: rebuildProgress.records.map((record) => ({
          ...record,
          relativeTime: formatRelativeTime(record.createdAt)
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

  openModeration() {
    wx.navigateTo({
      url: "/pages/moderation/index"
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
  },

  toggleRebuildTask(event) {
    const { id } = event.currentTarget.dataset;
    const selected = this.data.selectedRebuildTaskIds;
    const exists = selected.includes(id);
    const nextIds = exists ? selected.filter((item) => item !== id) : selected.concat(id);

    if (!exists && selected.length >= 3) {
      wx.showToast({
        title: "最多选 3 个小步",
        icon: "none"
      });
      return;
    }

    this.setData({
      selectedRebuildTaskIds: nextIds,
      rebuildTaskOptions: this.decorateRebuildTasks(nextIds)
    });
  },

  decorateRebuildTasks(selectedIds) {
    return rebuildService.rebuildTaskOptions.map((task) => ({
      ...task,
      selected: selectedIds.includes(task.id)
    }));
  },

  chooseRebuildMood(event) {
    this.setData({
      rebuildMoodLevel: Number(event.currentTarget.dataset.value)
    });
  },

  chooseRebuildUrge(event) {
    this.setData({
      rebuildUrgeLevel: Number(event.currentTarget.dataset.value)
    });
  },

  onRebuildNoteInput(event) {
    this.setData({
      rebuildNote: event.detail.value
    });
  },

  saveRebuildPlan() {
    if (this.data.savingRebuild) return;

    if (this.data.selectedRebuildTaskIds.length === 0) {
      wx.showToast({
        title: "先选一个小步",
        icon: "none"
      });
      return;
    }

    this.setData({
      savingRebuild: true
    });

    rebuildService.createDailyPlan({
      taskIds: this.data.selectedRebuildTaskIds,
      note: this.data.rebuildNote
    }).then(() => {
      this.setData({
        savingRebuild: false
      });
      this.loadProfile();
      wx.showToast({
        title: "今日计划已保存",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        savingRebuild: false
      });
      wx.showToast({
        title: "保存失败",
        icon: "none"
      });
    });
  },

  saveRebuildProgress() {
    if (this.data.savingRebuild) return;

    if (this.data.selectedRebuildTaskIds.length === 0 && !this.data.rebuildNote.trim()) {
      wx.showToast({
        title: "先写一点进展",
        icon: "none"
      });
      return;
    }

    this.setData({
      savingRebuild: true
    });

    rebuildService.createProgressEntry({
      taskIds: this.data.selectedRebuildTaskIds,
      moodLevel: this.data.rebuildMoodLevel,
      urgeLevel: this.data.rebuildUrgeLevel,
      note: this.data.rebuildNote
    }).then(() => {
      this.setData({
        selectedRebuildTaskIds: [],
        rebuildTaskOptions: this.decorateRebuildTasks([]),
        rebuildNote: "",
        savingRebuild: false
      });
      this.loadProfile();
      wx.showToast({
        title: "恢复进度已记录",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        savingRebuild: false
      });
      wx.showToast({
        title: "记录失败",
        icon: "none"
      });
    });
  }
});
