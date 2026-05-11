const { posts, comments } = require("./mockData");
const { createLocalId } = require("../utils/id");
const localStore = require("../utils/localStore");

const CREATED_POSTS_KEY = "heartbreakAlliance.createdPosts";
const CREATED_COMMENTS_KEY = "heartbreakAlliance.createdComments";

const postTypes = [
  { value: "vent", label: "倾诉" },
  { value: "review", label: "复盘" },
  { value: "advice", label: "求建议" }
];

const emotionTags = ["反复想联系", "睡不着", "委屈", "清醒一点", "想被理解", "正在重建"];
const PUBLIC_VISIBILITY = "小队可见";
const visibilityOptions = [PUBLIC_VISIBILITY, "仅自己和Agent可见"];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function allPosts() {
  return getCreatedPosts().concat(posts);
}

function publicPosts() {
  return allPosts().filter((post) => post.visibility === PUBLIC_VISIBILITY);
}

function allComments() {
  return getCreatedComments().concat(comments);
}

function getCreatedPosts() {
  return localStore.readArray(CREATED_POSTS_KEY);
}

function saveCreatedPosts(nextPosts) {
  localStore.write(CREATED_POSTS_KEY, nextPosts);
}

function getCreatedComments() {
  return localStore.readArray(CREATED_COMMENTS_KEY);
}

function saveCreatedComments(nextComments) {
  localStore.write(CREATED_COMMENTS_KEY, nextComments);
}

function countComments(postId) {
  return allComments().filter((comment) => comment.postId === postId).length;
}

function decoratePost(post) {
  return {
    ...post,
    commentCount: countComments(post.id)
  };
}

function getFeed() {
  return Promise.resolve(clone(publicPosts().map(decoratePost)));
}

function getPost(id) {
  const post = allPosts().find((item) => item.id === id) || null;
  return Promise.resolve(clone(post ? decoratePost(post) : null));
}

function getPostsByCommunity(communityId) {
  return Promise.resolve(clone(publicPosts().filter((post) => post.communityId === communityId).map(decoratePost)));
}

function getCommentsByPost(postId) {
  const matchedComments = allComments().filter((comment) => comment.postId === postId);
  return Promise.resolve(clone(matchedComments));
}

function getMyComments() {
  return Promise.resolve(clone(getCreatedComments()));
}

function getMyPosts() {
  return Promise.resolve(clone(getCreatedPosts().concat(posts.slice(0, 1)).map(decoratePost)));
}

function createPost(payload) {
  const selectedType = postTypes.find((item) => item.value === payload.type) || postTypes[0];
  const visibility = visibilityOptions.includes(payload.visibility) ? payload.visibility : PUBLIC_VISIBILITY;
  const post = {
    id: createLocalId("post-local"),
    communityId: payload.communityId,
    authorName: "匿名队友",
    type: selectedType.value,
    typeText: selectedType.label,
    emotion: payload.emotion,
    content: payload.content,
    createdAt: new Date().toISOString(),
    commentCount: 0,
    visibility
  };

  const nextPosts = getCreatedPosts();
  nextPosts.unshift(post);
  saveCreatedPosts(nextPosts);

  return Promise.resolve(clone(decoratePost(post)));
}

function createComment(payload) {
  const post = allPosts().find((item) => item.id === payload.postId);
  const content = (payload.content || "").trim();

  if (!post || !content) {
    return Promise.reject(new Error("invalid comment payload"));
  }

  const comment = {
    id: createLocalId("comment-local"),
    postId: payload.postId,
    authorName: "匿名队友",
    content,
    createdAt: new Date().toISOString()
  };

  const nextComments = getCreatedComments();
  nextComments.unshift(comment);
  saveCreatedComments(nextComments);

  return Promise.resolve(clone({
    comment,
    post: decoratePost(post)
  }));
}

module.exports = {
  postTypes,
  emotionTags,
  visibilityOptions,
  getFeed,
  getPost,
  getPostsByCommunity,
  getCommentsByPost,
  getMyComments,
  getMyPosts,
  createPost,
  createComment
};
