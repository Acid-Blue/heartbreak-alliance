const { communities } = require("./mockData");
const { createLocalId } = require("../utils/id");
const cloudApi = require("../utils/cloudApi");
const localStore = require("../utils/localStore");
const moderationService = require("./moderationService");

const COMMUNITY_CHECKINS_KEY = "heartbreakAlliance.communityCheckins";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCommunities() {
  return getCommunitiesWithMembership();
}

function getFeaturedCommunities() {
  return getCommunitiesWithMembership().then((items) => clone(items.slice().sort((a, b) => b.stageMatchScore - a.stageMatchScore).slice(0, 2)));
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
        community.stageMatchText,
        (community.tags || []).join(" "),
        (community.stageTags || community.stages || []).join(" ")
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

function getCommunityCheckins(communityId) {
  return cloudApi.callData("listCommunityCheckins", { communityId }).then((cloudRecords) => {
    return clone((cloudRecords || []).filter(moderationService.isVisibleRecord).concat(getLocalCommunityCheckins(communityId)).sort(sortByCreatedAtDesc).slice(0, 20));
  }).catch(() => Promise.resolve(clone(getLocalCommunityCheckins(communityId))));
}

function createCommunityCheckin(payload) {
  const communityId = String(payload.communityId || "").trim();
  const community = communities.find((item) => item.id === communityId);
  const content = String(payload.content || "").trim().slice(0, 180);

  if (!community || !content) {
    return Promise.reject(new Error("invalid community checkin"));
  }

  return require("./userService").getCurrentUser().then((user) => {
    const record = moderationService.applyModeration({
      id: createLocalId("checkin-local"),
      communityId,
      communityName: community.name,
      stage: user.stage || "急性期",
      authorName: user.nickname || "匿名队友",
      prompt: community.checkinPrompt || "今天我守住的一件事是",
      content,
      createdAt: new Date().toISOString()
    }, content);

    return cloudApi.callData("createCommunityCheckin", { record }).then((cloudRecord) => {
      return clone(cloudRecord);
    }).catch(() => {
      const records = localStore.readArray(COMMUNITY_CHECKINS_KEY);
      records.unshift(record);
      localStore.write(COMMUNITY_CHECKINS_KEY, records);
      return Promise.resolve(clone(record));
    });
  });
}

function getCommunitiesWithMembership() {
  return require("./userService").getCurrentUser().then((user) => {
    const joinedCommunityIds = user.joinedCommunityIds || [];

    return clone(communities.map((community) => decorateCommunity(community, user, joinedCommunityIds)));
  }).catch(() => clone(communities.map((community) => decorateCommunity(community, { stage: "急性期" }, []))));
}

function decorateCommunity(community, user, joinedCommunityIds) {
  const stage = user.stage || "急性期";
  const stages = community.stages || [];
  const isStageMatch = stages.includes(stage);

  return {
    ...community,
    isJoined: joinedCommunityIds.includes(community.id),
    stageMatchScore: isStageMatch ? 1 : 0,
    stageMatchText: isStageMatch ? `适合${stage}` : `也欢迎${stage}`,
    stageTags: stages
  };
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

function getLocalCommunityCheckins(communityId) {
  return localStore.readArray(COMMUNITY_CHECKINS_KEY)
    .filter((record) => record.communityId === communityId)
    .filter(moderationService.isVisibleRecord)
    .sort(sortByCreatedAtDesc);
}

function sortByCreatedAtDesc(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

module.exports = {
  getCommunities,
  getFeaturedCommunities,
  getCommunity,
  searchCommunities,
  joinCommunity,
  leaveCommunity,
  getCommunityCheckins,
  createCommunityCheckin
};
