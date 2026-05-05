const { currentUser, communities } = require("./mockData");
const { getMyPosts } = require("./postService");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCurrentUser() {
  return Promise.resolve(clone(currentUser));
}

function getJoinedCommunities() {
  const joined = communities.filter((community) => currentUser.joinedCommunityIds.includes(community.id));
  return Promise.resolve(clone(joined));
}

module.exports = {
  getCurrentUser,
  getJoinedCommunities,
  getMyPosts
};
