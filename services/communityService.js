const { communities } = require("./mockData");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCommunities() {
  return Promise.resolve(clone(communities));
}

function getFeaturedCommunities() {
  return Promise.resolve(clone(communities.slice(0, 2)));
}

function getCommunity(id) {
  const community = communities.find((item) => item.id === id) || null;
  return Promise.resolve(clone(community));
}

module.exports = {
  getCommunities,
  getFeaturedCommunities,
  getCommunity
};
