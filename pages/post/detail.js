const communityService = require("../../services/communityService");
const postService = require("../../services/postService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    postId: "",
    post: null,
    community: null,
    comments: [],
    commentInput: "",
    submitting: false,
    boundary: getApp().globalData.serviceBoundary
  },

  onLoad(options) {
    const postId = options.id || "";
    this.setData({
      postId
    });
    this.loadDetail(postId);
  },

  onShow() {
    if (this.data.postId && !this.data.loading) {
      this.loadDetail();
    }
  },

  loadDetail(targetPostId) {
    const postId = typeof targetPostId === "string" ? targetPostId : this.data.postId;

    if (!postId) {
      this.setData({
        loading: false,
        error: "帖子不存在或已删除"
      });
      return;
    }

    this.setData({
      loading: true,
      error: ""
    });

    postService.getPost(postId).then((post) => {
      if (!post) {
        this.setData({
          post: null,
          community: null,
          comments: [],
          error: "帖子不存在或已删除",
          loading: false
        });
        return null;
      }

      return Promise.all([
        communityService.getCommunity(post.communityId),
        postService.getCommentsByPost(post.id)
      ]).then(([community, comments]) => {
        this.setData({
          post: this.decoratePost(post),
          community,
          comments: this.decorateComments(comments),
          loading: false
        });
      });
    }).catch(() => {
      this.setData({
        error: "帖子内容加载失败，请稍后再试",
        loading: false
      });
    });
  },

  decoratePost(post) {
    return {
      ...post,
      relativeTime: formatRelativeTime(post.createdAt)
    };
  },

  decorateComments(comments) {
    return comments.map((comment) => ({
      ...comment,
      relativeTime: formatRelativeTime(comment.createdAt)
    }));
  },

  onCommentInput(event) {
    this.setData({
      commentInput: event.detail.value
    });
  },

  submitComment() {
    const content = this.data.commentInput.trim();

    if (this.data.submitting) return;

    if (!content) {
      wx.showToast({
        title: "先写下一点回应",
        icon: "none"
      });
      return;
    }

    this.setData({
      submitting: true
    });

    postService.createComment({
      postId: this.data.postId,
      content
    }).then(({ comment, post }) => {
      this.setData({
        post: this.decoratePost(post),
        comments: this.decorateComments([comment]).concat(this.data.comments),
        commentInput: "",
        submitting: false
      });
      wx.showToast({
        title: "已回应",
        icon: "success"
      });
    }).catch(() => {
      this.setData({
        submitting: false
      });
      wx.showToast({
        title: "回应失败，请稍后再试",
        icon: "none"
      });
    });
  },

  openCommunity() {
    if (!this.data.community) return;

    wx.navigateTo({
      url: `/pages/community/detail?id=${this.data.community.id}`
    });
  }
});
