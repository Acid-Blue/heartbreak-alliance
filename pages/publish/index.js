const communityService = require("../../services/communityService");
const postService = require("../../services/postService");

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
    this.updateForm("content", event.detail.value);
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
    }).then(() => {
      wx.showToast({
        title: "已发布到小队",
        icon: "success"
      });
      this.setData({
        "form.content": "",
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
