const communityService = require("../../services/communityService");
const postService = require("../../services/postService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    communityId: "",
    community: null,
    posts: [],
    joining: false
  },

  onLoad(options) {
    const communityId = options.id || "squad-001";
    this.setData({
      communityId
    });
    this.loadDetail(communityId);
  },

  onShow() {
    if (this.data.communityId && !this.data.loading) {
      this.loadDetail();
    }
  },

  loadDetail(targetCommunityId) {
    const communityId = typeof targetCommunityId === "string" ? targetCommunityId : this.data.communityId;
    this.setData({
      loading: true,
      error: ""
    });

    Promise.all([
      communityService.getCommunity(communityId),
      postService.getPostsByCommunity(communityId)
    ]).then(([community, posts]) => {
      if (!community) {
        this.setData({
          community: null,
          posts: [],
          error: "小队不存在或已关闭",
          loading: false
        });
        return;
      }

      this.setData({
        community,
        posts: posts.map((post) => ({
          ...post,
          relativeTime: formatRelativeTime(post.createdAt)
        })),
        loading: false
      });
    }).catch(() => {
      this.setData({
        error: "小队内容加载失败，请稍后再试",
        loading: false
      });
    });
  },

  openPublish() {
    if (!this.data.community) {
      wx.showToast({
        title: "小队不可用",
        icon: "none"
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/publish/index?communityId=${this.data.communityId}`
    });
  },

  toggleJoin() {
    if (!this.data.community || this.data.joining) return;

    const joined = this.data.community.isJoined;
    const action = joined ? communityService.leaveCommunity : communityService.joinCommunity;

    this.setData({
      joining: true
    });

    action(this.data.communityId).then((community) => {
      this.setData({
        community,
        joining: false
      });
      wx.showToast({
        title: joined ? "已退出小队" : "已加入小队",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        joining: false
      });
      wx.showToast({
        title: "操作失败",
        icon: "none"
      });
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
  }
});
