const { currentUser, communities } = require("./mockData");
const { getMyPosts } = require("./postService");
const localStore = require("../utils/localStore");

const AGENT_PERMISSIONS_KEY = "heartbreakAlliance.agentPermissions";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultAgentPermissions() {
  const enabled = currentUser.agentConsent !== false;
  return {
    ownContent: enabled,
    publicCommunityContent: enabled
  };
}

function normalizeAgentPermissions(value) {
  const defaults = defaultAgentPermissions();
  const permissions = value || {};
  return {
    ownContent: typeof permissions.ownContent === "boolean" ? permissions.ownContent : defaults.ownContent,
    publicCommunityContent: typeof permissions.publicCommunityContent === "boolean"
      ? permissions.publicCommunityContent
      : defaults.publicCommunityContent
  };
}

function readAgentPermissions() {
  return normalizeAgentPermissions(localStore.read(AGENT_PERMISSIONS_KEY, defaultAgentPermissions()));
}

function getCurrentUser() {
  const agentPermissions = readAgentPermissions();
  return Promise.resolve(clone({
    ...currentUser,
    agentConsent: agentPermissions.ownContent || agentPermissions.publicCommunityContent,
    agentPermissions
  }));
}

function getJoinedCommunities() {
  const joined = communities.filter((community) => currentUser.joinedCommunityIds.includes(community.id));
  return Promise.resolve(clone(joined));
}

function updateAgentPermissions(patch) {
  const nextPermissions = normalizeAgentPermissions({
    ...readAgentPermissions(),
    ...patch
  });
  localStore.write(AGENT_PERMISSIONS_KEY, nextPermissions);
  return Promise.resolve(clone(nextPermissions));
}

module.exports = {
  getCurrentUser,
  getJoinedCommunities,
  getMyPosts,
  updateAgentPermissions
};
