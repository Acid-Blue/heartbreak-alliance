const { communities } = require("./mockData");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCommunities() {
  return getCommunitiesWithMembership();
}

function getFeaturedCommunities() {
  return getCommunitiesWithMembership().then((items) => clone(items.slice(0, 2)));
}

function getCommunity(id) {
  return getCommunitiesWithMembership().then((items) => {
    const community = items.find((item) => item.id === id) || null;
    return clone(community);
  });
}

function searchCommunities(query) {
  const keyword = normalizeKeyword(query);

  return getCommunitiesWithMembership().then((items) => {
    if (!keyword) {
      return clone(items);
    }

    return clone(items.filter((community) => {
      const haystack = [
        community.name,
        community.summary,
        community.mood,
        (community.tags || []).join(" ")
      ].join(" ").toLowerCase();
      return haystack.includes(keyword);
    }));
  });
}

function joinCommunity(id) {
  return updateCommunityMembership(id, true);
}

function leaveCommunity(id) {
  return updateCommunityMembership(id, false);
}

function getCommunitiesWithMembership() {
  return require("./userService").getCurrentUser().then((user) => {
    const joinedCommunityIds = user.joinedCommunityIds || [];

    return clone(communities.map((community) => ({
      ...community,
      isJoined: joinedCommunityIds.includes(community.id)
    })));
  }).catch(() => clone(communities));
}

function updateCommunityMembership(id, shouldJoin) {
  const exists = communities.some((community) => community.id === id);

  if (!exists) {
    return Promise.reject(new Error("community not found"));
  }

  const userService = require("./userService");

  return userService.getCurrentUser().then((user) => {
    const joinedCommunityIds = user.joinedCommunityIds || [];
    const nextIds = shouldJoin
      ? Array.from(new Set(joinedCommunityIds.concat(id)))
      : joinedCommunityIds.filter((item) => item !== id);

    return userService.updateUserProfile({
      joinedCommunityIds: nextIds
    }).then(() => getCommunity(id));
  });
}

function normalizeKeyword(query) {
  return String(query || "").trim().toLowerCase();
}

module.exports = {
  getCommunities,
  getFeaturedCommunities,
  getCommunity,
  searchCommunities,
  joinCommunity,
  leaveCommunity
};
