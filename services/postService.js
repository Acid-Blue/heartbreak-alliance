const { posts } = require("./mockData");

const createdPosts = [];

const postTypes = [
  { value: "vent", label: "倾诉" },
  { value: "review", label: "复盘" },
  { value: "advice", label: "求建议" }
];

const emotionTags = ["反复想联系", "睡不着", "委屈", "清醒一点", "想被理解", "正在重建"];
const visibilityOptions = ["小队可见", "仅自己和Agent可见"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function allPosts() {
  return createdPosts.concat(posts);
}

function getFeed() {
  return Promise.resolve(clone(allPosts()));
}

function getPostsByCommunity(communityId) {
  return Promise.resolve(clone(allPosts().filter((post) => post.communityId === communityId)));
}

function getMyPosts() {
  return Promise.resolve(clone(createdPosts.concat(posts.slice(0, 1))));
}

function createPost(payload) {
  const selectedType = postTypes.find((item) => item.value === payload.type) || postTypes[0];
  const post = {
    id: `post-local-${Date.now()}`,
    communityId: payload.communityId,
    authorName: "匿名队友",
    type: selectedType.value,
    typeText: selectedType.label,
    emotion: payload.emotion,
    content: payload.content,
    createdAt: new Date().toISOString(),
    commentCount: 0,
    visibility: payload.visibility || "小队可见"
  };

  createdPosts.unshift(post);
  return Promise.resolve(clone(post));
}

module.exports = {
  postTypes,
  emotionTags,
  visibilityOptions,
  getFeed,
  getPostsByCommunity,
  getMyPosts,
  createPost
};
