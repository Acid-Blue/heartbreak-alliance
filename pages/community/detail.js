const communityService = require("../../services/communityService");
const postService = require("../../services/postService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    communityId: "",
    community: null,
    posts: []
  },

  onLoad(options) {
    this.setData({
      communityId: options.id || "squad-001"
    });
    this.loadDetail();
  },

  onShow() {
    if (this.data.communityId) {
      this.loadDetail();
    }
  },

  loadDetail() {
    const { communityId } = this.data;
    Promise.all([
      communityService.getCommunity(communityId),
      postService.getPostsByCommunity(communityId)
    ]).then(([community, posts]) => {
      this.setData({
        community,
        posts: posts.map((post) => ({
          ...post,
          relativeTime: formatRelativeTime(post.createdAt)
        })),
        loading: false
      });
    });
  },

  openPublish() {
    wx.navigateTo({
      url: `/pages/publish/index?communityId=${this.data.communityId}`
    });
  },

  openAgent() {
    wx.switchTab({
      url: "/pages/agent/index"
    });
  }
});
