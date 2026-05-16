const communityService = require("../../services/communityService");
const postService = require("../../services/postService");
const reportService = require("../../services/reportService");
const moderationService = require("../../services/moderationService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    postId: "",
    post: null,
    community: null,
    comments: [],
    responseTemplates: moderationService.responseTemplates,
    commentInput: "",
    commentNotice: "",
    submitting: false,
    reporting: false,
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
    const value = event.detail.value;
    const moderation = moderationService.detectModeration(value);
    this.setData({
      commentInput: value,
      commentNotice: moderation.notice
    });
  },

  chooseResponseTemplate(event) {
    const { text } = event.currentTarget.dataset;
    const prefix = this.data.commentInput ? `${this.data.commentInput}\n${text}` : text;
    const moderation = moderationService.detectModeration(prefix);
    this.setData({
      commentInput: prefix,
      commentNotice: moderation.notice
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
      if (comment.moderationStatus === "review") {
        this.setData({
          post: this.decoratePost(post),
          commentInput: "",
          commentNotice: comment.moderationNotice,
          submitting: false
        });
        wx.showToast({
          title: "回应已进入审核",
          icon: "none"
        });
        return;
      }

      this.setData({
        post: this.decoratePost(post),
        comments: this.decorateComments([comment]).concat(this.data.comments),
        commentInput: "",
        commentNotice: "",
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

  reportPost() {
    if (!this.data.post) return;

    this.chooseReportReason({
      targetType: "post",
      targetId: this.data.post.id
    });
  },

  reportComment(event) {
    const { id } = event.currentTarget.dataset;

    this.chooseReportReason({
      targetType: "comment",
      targetId: id
    });
  },

  chooseReportReason(target) {
    if (this.data.reporting) return;

    wx.showActionSheet({
      itemList: reportService.reportReasons.map((reason) => reason.label),
      success: (response) => {
        const reason = reportService.reportReasons[response.tapIndex] || reportService.reportReasons[0];
        this.submitReport({
          ...target,
          reason: reason.value
        });
      }
    });
  },

  submitReport(payload) {
    this.setData({
      reporting: true
    });

    reportService.createReport(payload).then(() => {
      this.setData({
        reporting: false
      });
      wx.showToast({
        title: "已提交举报",
        icon: "success"
      });
      this.loadDetail();
    }).catch(() => {
      this.setData({
        reporting: false
      });
      wx.showToast({
        title: "提交失败",
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
