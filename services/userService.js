const { currentUser, communities } = require("./mockData");
const cloudApi = require("../utils/cloudApi");
const localStore = require("../utils/localStore");

const AGENT_PERMISSIONS_KEY = "heartbreakAlliance.agentPermissions";
const USER_PROFILE_KEY = "heartbreakAlliance.userProfile";
const defaultJoinedCommunityIds = currentUser.joinedCommunityIds;
const profileStages = ["急性期", "复盘期", "孤独期", "重建期"];

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
  return Promise.all([
    getUserProfile(),
    getAgentPermissions()
  ]).then(([profile, agentPermissions]) => buildCurrentUser(profile, agentPermissions));
}

function getUserProfile() {
  const fallback = readLocalProfile();
  return cloudApi.callData("getUserProfile").then((profile) => {
    const normalized = normalizeUserProfile(profile, true);
    localStore.write(USER_PROFILE_KEY, normalized);
    return normalized;
  }).catch(() => Promise.resolve(normalizeUserProfile(fallback, false)));
}

function getAgentPermissions() {
  return cloudApi.callData("getSetting", {
    key: AGENT_PERMISSIONS_KEY,
    fallback: readAgentPermissions()
  }).then((value) => {
    return normalizeAgentPermissions(value);
  }).catch(() => Promise.resolve(readAgentPermissions()));
}

function getJoinedCommunities() {
  return getCurrentUser().then((user) => {
    const joinedCommunityIds = user.joinedCommunityIds || defaultJoinedCommunityIds;
    const joined = communities.filter((community) => joinedCommunityIds.includes(community.id));
    return clone(joined);
  });
}

function getMyPosts() {
  return require("./postService").getMyPosts();
}

function loginWithWeChatProfile() {
  return requestWeChatUserProfile().then((userInfo) => {
    return updateUserProfile({
      nickname: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
      avatar: (userInfo.nickName || "阵").slice(0, 1),
      isProfileAuthorized: true
    });
  });
}

function requestWeChatUserProfile() {
  if (typeof wx === "undefined" || !wx || typeof wx.getUserProfile !== "function") {
    return Promise.reject(new Error("wx.getUserProfile is unavailable"));
  }

  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: "用于展示你的昵称和头像",
      success: (response) => resolve(response.userInfo || {}),
      fail: reject
    });
  });
}

function updateUserProfile(patch) {
  const nextProfile = normalizeUserProfile({
    ...readLocalProfile(),
    ...patch
  }, false);

  return uploadAvatarIfNeeded(nextProfile).then((profileWithAvatar) => {
    localStore.write(USER_PROFILE_KEY, profileWithAvatar);

    return cloudApi.callData("updateUserProfile", {
      profile: profileWithAvatar
    }).then((profile) => {
      const normalized = normalizeUserProfile(profile, true);
      localStore.write(USER_PROFILE_KEY, normalized);
      return normalized;
    }).catch(() => {
      const fallback = normalizeUserProfile(profileWithAvatar, false);
      localStore.write(USER_PROFILE_KEY, fallback);
      return fallback;
    });
  });
}

function logoutLocalProfile() {
  const nextProfile = normalizeUserProfile(defaultLocalProfile(), false);
  localStore.write(USER_PROFILE_KEY, nextProfile);

  return cloudApi.callData("updateUserProfile", {
    profile: nextProfile
  }).then((profile) => {
    const normalized = normalizeUserProfile(profile, true);
    localStore.write(USER_PROFILE_KEY, normalized);
    return normalized;
  }).catch(() => Promise.resolve(clone(nextProfile)));
}

function updateAgentPermissions(patch) {
  const nextPermissions = normalizeAgentPermissions({
    ...readAgentPermissions(),
    ...patch
  });
  localStore.write(AGENT_PERMISSIONS_KEY, nextPermissions);
  return cloudApi.callData("setSetting", {
    key: AGENT_PERMISSIONS_KEY,
    value: nextPermissions
  }).then(() => clone(nextPermissions)).catch(() => Promise.resolve(clone(nextPermissions)));
}

function buildCurrentUser(profile, agentPermissions) {
  return clone({
    ...currentUser,
    ...profile,
    joinedCommunityIds: profile.joinedCommunityIds || defaultJoinedCommunityIds,
    agentConsent: agentPermissions.ownContent || agentPermissions.publicCommunityContent,
    agentPermissions
  });
}

function defaultLocalProfile() {
  return {
    id: currentUser.id,
    nickname: currentUser.nickname,
    avatar: currentUser.avatar,
    avatarUrl: "",
    bio: "",
    stage: "急性期",
    joinedCommunityIds: defaultJoinedCommunityIds,
    isProfileAuthorized: false,
    isCloudUser: false
  };
}

function readLocalProfile() {
  return normalizeUserProfile(localStore.read(USER_PROFILE_KEY, defaultLocalProfile()), false);
}

function normalizeUserProfile(value, isCloudUser) {
  const profile = value || {};
  const nickname = String(profile.nickname || currentUser.nickname || "匿名队友").trim().slice(0, 24) || "匿名队友";
  const avatar = String(profile.avatar || nickname.slice(0, 1) || currentUser.avatar || "阵").trim().slice(0, 2) || "阵";
  const stage = profileStages.includes(profile.stage) ? profile.stage : "急性期";

  return {
    id: profile.id || currentUser.id,
    nickname,
    avatar,
    avatarUrl: String(profile.avatarUrl || ""),
    bio: String(profile.bio || "").slice(0, 80),
    stage,
    joinedCommunityIds: Array.isArray(profile.joinedCommunityIds) ? profile.joinedCommunityIds : defaultJoinedCommunityIds,
    isProfileAuthorized: profile.isProfileAuthorized === true,
    isCloudUser: isCloudUser === true
  };
}

function uploadAvatarIfNeeded(profile) {
  const avatarUrl = profile.avatarUrl || "";

  if (!cloudApi.canUseCloud()
    || !avatarUrl
    || avatarUrl.indexOf("cloud://") === 0
    || avatarUrl.indexOf("http://") === 0
    || avatarUrl.indexOf("https://") === 0
    || typeof wx === "undefined"
    || !wx.cloud
    || typeof wx.cloud.uploadFile !== "function") {
    return Promise.resolve(profile);
  }

  const ext = avatarUrl.includes(".png") ? "png" : "jpg";
  const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  return wx.cloud.uploadFile({
    cloudPath,
    filePath: avatarUrl
  }).then((response) => ({
    ...profile,
    avatarUrl: response.fileID || avatarUrl
  })).catch(() => profile);
}

module.exports = {
  profileStages,
  getCurrentUser,
  getUserProfile,
  getJoinedCommunities,
  getMyPosts,
  loginWithWeChatProfile,
  updateUserProfile,
  logoutLocalProfile,
  updateAgentPermissions
};
