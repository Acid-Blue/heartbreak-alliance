const communityService = require("../../services/communityService");
const postService = require("../../services/postService");
const moderationService = require("../../services/moderationService");

Page({
  data: {
    loading: true,
    error: "",
    communityId: "squad-001",
    community: null,
    postTypes: postService.postTypes,
    emotionTags: postService.emotionTags,
    visibilityOptions: postService.visibilityOptions,
    form: {
      type: "vent",
      emotion: "反复想联系",
      visibility: "小队可见",
      content: ""
    },
    contentNotice: "",
    submitting: false
  },

  onLoad(options) {
    const communityId = options.communityId || "squad-001";
    this.setData({
      communityId,
      loading: true,
      error: ""
    });

    communityService.getCommunity(communityId).then((community) => {
      if (!community) {
        this.setData({
          community: null,
          error: "小队不存在或已关闭，暂时不能发布",
          loading: false
        });
        return;
      }

      this.setData({
        community,
        loading: false
      });
    }).catch(() => {
      this.setData({
        error: "小队信息加载失败，请稍后再试",
        loading: false
      });
    });
  },

  chooseType(event) {
    this.updateForm("type", event.currentTarget.dataset.value);
  },

  chooseEmotion(event) {
    this.updateForm("emotion", event.currentTarget.dataset.value);
  },

  chooseVisibility(event) {
    this.updateForm("visibility", event.currentTarget.dataset.value);
  },

  onContentInput(event) {
    const content = event.detail.value;
    this.updateForm("content", content);
    this.setData({
      contentNotice: moderationService.detectModeration(content).notice
    });
  },

  updateForm(key, value) {
    this.setData({
      [`form.${key}`]: value
    });
  },

  submitPost() {
    const { form, communityId, community, submitting } = this.data;
    const content = form.content.trim();

    if (submitting) return;

    if (!community) {
      wx.showToast({
        title: "小队不可用",
        icon: "none"
      });
      return;
    }

    if (!content) {
      wx.showToast({
        title: "先写下一点内容",
        icon: "none"
      });
      return;
    }

    this.setData({ submitting: true });
    postService.createPost({
      ...form,
      content,
      communityId
    }).then((post) => {
      const isReview = post.moderationStatus === "review";
      wx.showToast({
        title: isReview ? "内容已进入审核" : "已发布到小队",
        icon: isReview ? "none" : "success"
      });
      this.setData({
        "form.content": "",
        contentNotice: isReview ? post.moderationNotice : "",
        submitting: false
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 500);
    }).catch(() => {
      this.setData({ submitting: false });
      wx.showToast({
        title: "发布失败，请稍后再试",
        icon: "none"
      });
    });
  }
});
