const { posts, comments } = require("./mockData");
const { createLocalId } = require("../utils/id");
const cloudApi = require("../utils/cloudApi");
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

function normalizeCloudPosts(cloudPosts) {
  return (cloudPosts || []).map((post) => ({
    ...post,
    commentCount: post.commentCount || 0
  }));
}

function getCurrentAuthorName() {
  return require("./userService").getCurrentUser()
    .then((user) => user.nickname || "匿名队友")
    .catch(() => "匿名队友");
}

function getFeed() {
  return cloudApi.callData("listPublicPosts").then((cloudPosts) => {
    return clone(normalizeCloudPosts(cloudPosts).concat(publicPosts().map(decoratePost)));
  }).catch(() => Promise.resolve(clone(publicPosts().map(decoratePost))));
}

function getPost(id) {
  return cloudApi.callData("getPost", { id }).then((cloudPost) => {
    if (cloudPost) {
      return clone({
        ...cloudPost,
        commentCount: cloudPost.commentCount || 0
      });
    }
    const post = allPosts().find((item) => item.id === id) || null;
    return clone(post ? decoratePost(post) : null);
  }).catch(() => {
    const post = allPosts().find((item) => item.id === id) || null;
    return Promise.resolve(clone(post ? decoratePost(post) : null));
  });
}

function getPostsByCommunity(communityId) {
  return cloudApi.callData("listPostsByCommunity", { communityId }).then((cloudPosts) => {
    const mockPosts = publicPosts().filter((post) => post.communityId === communityId).map(decoratePost);
    return clone(normalizeCloudPosts(cloudPosts).concat(mockPosts));
  }).catch(() => Promise.resolve(clone(publicPosts().filter((post) => post.communityId === communityId).map(decoratePost))));
}

function getCommentsByPost(postId) {
  return cloudApi.callData("listCommentsByPost", { postId }).then((cloudComments) => {
    const matchedComments = allComments().filter((comment) => comment.postId === postId);
    return clone((cloudComments || []).concat(matchedComments));
  }).catch(() => {
    const matchedComments = allComments().filter((comment) => comment.postId === postId);
    return Promise.resolve(clone(matchedComments));
  });
}

function getMyComments() {
  return cloudApi.callData("listMyComments").then((cloudComments) => {
    return clone((cloudComments || []).concat(getCreatedComments()));
  }).catch(() => Promise.resolve(clone(getCreatedComments())));
}

function getMyPosts() {
  return cloudApi.callData("listMyPosts").then((cloudPosts) => {
    return clone(normalizeCloudPosts(cloudPosts).concat(getCreatedPosts().concat(posts.slice(0, 1)).map(decoratePost)));
  }).catch(() => Promise.resolve(clone(getCreatedPosts().concat(posts.slice(0, 1)).map(decoratePost))));
}

function createPost(payload) {
  const selectedType = postTypes.find((item) => item.value === payload.type) || postTypes[0];
  const visibility = visibilityOptions.includes(payload.visibility) ? payload.visibility : PUBLIC_VISIBILITY;

  return getCurrentAuthorName().then((authorName) => {
    const post = {
      id: createLocalId("post-local"),
      communityId: payload.communityId,
      authorName,
      type: selectedType.value,
      typeText: selectedType.label,
      emotion: payload.emotion,
      content: payload.content,
      createdAt: new Date().toISOString(),
      commentCount: 0,
      visibility
    };

    return cloudApi.callData("createPost", { post }).then((cloudPost) => {
      return clone({
        ...cloudPost,
        commentCount: cloudPost.commentCount || 0
      });
    }).catch(() => {
      const nextPosts = getCreatedPosts();
      nextPosts.unshift(post);
      saveCreatedPosts(nextPosts);
      return Promise.resolve(clone(decoratePost(post)));
    });
  });
}

function createComment(payload) {
  const content = (payload.content || "").trim();

  if (!content) {
    return Promise.reject(new Error("invalid comment payload"));
  }

  return getPost(payload.postId).then((post) => {
    if (!post) {
      throw new Error("invalid comment payload");
    }

    return getCurrentAuthorName().then((authorName) => {
      const comment = {
        id: createLocalId("comment-local"),
        postId: payload.postId,
        authorName,
        content,
        createdAt: new Date().toISOString()
      };

      return cloudApi.callData("createComment", { comment }).then((cloudComment) => {
        return getPost(payload.postId).then((nextPost) => clone({
          comment: cloudComment,
          post: nextPost || decoratePost(post)
        }));
      }).catch(() => {
        const nextComments = getCreatedComments();
        nextComments.unshift(comment);
        saveCreatedComments(nextComments);
        return Promise.resolve(clone({
          comment,
          post: decoratePost(post)
        }));
      });
    });
  });
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
