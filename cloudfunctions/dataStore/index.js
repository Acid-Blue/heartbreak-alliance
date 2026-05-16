const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const COLLECTIONS = {
  posts: "ha_posts",
  comments: "ha_comments",
  agentMessages: "ha_agent_messages",
  urgeRecords: "ha_urge_records",
  reviewRecords: "ha_review_records",
  rebuildRecords: "ha_rebuild_records",
  communityCheckins: "ha_community_checkins",
  settings: "ha_user_settings",
  users: "ha_users",
  reports: "ha_reports"
};
const PROFILE_STAGES = ["急性期", "复盘期", "孤独期", "重建期"];
const COMMUNITY_IDS = ["squad-001", "squad-002", "squad-003"];

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const action = event.action;
  const payload = event.payload || {};

  try {
    const data = await runAction(action, payload, OPENID);
    return {
      ok: true,
      data
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || "dataStore failed"
    };
  }
};

async function runAction(action, payload, openId) {
  if (!openId) {
    throw new Error("missing openid");
  }

  switch (action) {
    case "listPublicPosts":
      return listPublicPosts();
    case "listPostsByCommunity":
      return listPostsByCommunity(payload.communityId);
    case "listMyPosts":
      return listMyRecords(COLLECTIONS.posts, openId);
    case "getPost":
      return getPost(payload.id);
    case "createPost":
      return createPost(payload.post, openId);
    case "listCommentsByPost":
      return listCommentsByPost(payload.postId);
    case "listMyComments":
      return listMyRecords(COLLECTIONS.comments, openId);
    case "createComment":
      return createComment(payload.comment, openId);
    case "listAgentMessages":
      return listMyRecords(COLLECTIONS.agentMessages, openId, "asc");
    case "createAgentMessages":
      return createAgentMessages(payload.messages, openId);
    case "listUrgeRecords":
      return listMyRecords(COLLECTIONS.urgeRecords, openId);
    case "createUrgeRecord":
      return createRecord(COLLECTIONS.urgeRecords, payload.record, openId);
    case "listReviewRecords":
      return listMyRecords(COLLECTIONS.reviewRecords, openId);
    case "createReviewRecord":
      return createRecord(COLLECTIONS.reviewRecords, payload.record, openId);
    case "listRebuildRecords":
      return listMyRecords(COLLECTIONS.rebuildRecords, openId);
    case "createRebuildRecord":
      return createRecord(COLLECTIONS.rebuildRecords, payload.record, openId);
    case "listCommunityCheckins":
      return listCommunityCheckins(payload.communityId);
    case "createCommunityCheckin":
      return createRecord(COLLECTIONS.communityCheckins, payload.record, openId);
    case "getSetting":
      return getSetting(payload.key, payload.fallback, openId);
    case "setSetting":
      return setSetting(payload.key, payload.value, openId);
    case "getUserProfile":
      return getUserProfile(openId);
    case "updateUserProfile":
      return updateUserProfile(payload.profile, openId);
    case "listMyReports":
      return listMyRecords(COLLECTIONS.reports, openId);
    case "createReport":
      return createRecord(COLLECTIONS.reports, sanitizeReport(payload.report), openId);
    case "updateReportStatus":
      return updateReportStatus(payload.id, payload.status, openId);
    default:
      throw new Error(`unsupported action: ${action}`);
  }
}

async function listPublicPosts() {
  const result = await db.collection(COLLECTIONS.posts)
    .where({
      visibility: "小队可见"
    })
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return normalizeList(result.data).filter(isVisibleRecord);
}

async function listCommunityCheckins(communityId) {
  if (!COMMUNITY_IDS.includes(communityId)) {
    return [];
  }

  const result = await db.collection(COLLECTIONS.communityCheckins)
    .where({
      communityId
    })
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return normalizeList(result.data).filter(isVisibleRecord);
}

async function listPostsByCommunity(communityId) {
  const result = await db.collection(COLLECTIONS.posts)
    .where({
      communityId,
      visibility: "小队可见"
    })
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return normalizeList(result.data).filter(isVisibleRecord);
}

async function listMyRecords(collectionName, openId, direction = "desc") {
  const result = await db.collection(collectionName)
    .where({
      userOpenId: openId
    })
    .orderBy("createdAt", direction)
    .limit(100)
    .get();
  return normalizeList(result.data).filter(isVisibleRecord);
}

async function getPost(id) {
  const result = await db.collection(COLLECTIONS.posts)
    .where(_.or([
      { _id: id },
      { id }
    ]))
    .limit(1)
    .get();
  return result.data[0] ? normalizeRecord(result.data[0]) : null;
}

async function createPost(post, openId) {
  return createRecord(COLLECTIONS.posts, post, openId);
}

async function listCommentsByPost(postId) {
  const result = await db.collection(COLLECTIONS.comments)
    .where({
      postId
    })
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return normalizeList(result.data);
}

async function createComment(comment, openId) {
  const saved = await createRecord(COLLECTIONS.comments, comment, openId);

  if (!isVisibleRecord(comment)) {
    return saved;
  }

  try {
    const post = await getPostDocument(comment.postId);
    if (post) {
      await db.collection(COLLECTIONS.posts)
        .doc(post._id)
        .update({
          data: {
            commentCount: _.inc(1)
          }
        });
    }
  } catch (error) {
    // Older local/mock IDs may not map to cloud document IDs; comment creation still succeeds.
  }

  return saved;
}

async function createAgentMessages(messages, openId) {
  const nextMessages = Array.isArray(messages) ? messages : [];
  const saved = [];

  for (const message of nextMessages) {
    saved.push(await createRecord(COLLECTIONS.agentMessages, message, openId));
  }

  return saved;
}

async function getSetting(key, fallback, openId) {
  const result = await db.collection(COLLECTIONS.settings)
    .where({
      userOpenId: openId,
      key
    })
    .limit(1)
    .get();
  return result.data[0] ? result.data[0].value : fallback;
}

async function setSetting(key, value, openId) {
  const collection = db.collection(COLLECTIONS.settings);
  const existing = await collection
    .where({
      userOpenId: openId,
      key
    })
    .limit(1)
    .get();

  if (existing.data[0]) {
    await collection.doc(existing.data[0]._id).update({
      data: {
        value,
        updatedAt: new Date().toISOString()
      }
    });
    return value;
  }

  await collection.add({
    data: {
      userOpenId: openId,
      key,
      value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });
  return value;
}

async function getUserProfile(openId) {
  const existing = await findUserProfile(openId);

  if (existing) {
    return normalizeRecord(existing);
  }

  return createUserProfile(defaultUserProfile(openId), openId);
}

async function updateUserProfile(profile, openId) {
  const existing = await findUserProfile(openId);
  const sanitized = sanitizeUserProfile(profile, openId);

  if (existing) {
    await db.collection(COLLECTIONS.users).doc(existing._id).update({
      data: {
        ...sanitized,
        updatedAt: new Date().toISOString()
      }
    });
    return normalizeRecord({
      ...existing,
      ...sanitized,
      updatedAt: new Date().toISOString()
    });
  }

  return createUserProfile(sanitized, openId);
}

async function findUserProfile(openId) {
  const result = await db.collection(COLLECTIONS.users)
    .where({
      userOpenId: openId
    })
    .limit(1)
    .get();
  return result.data[0] || null;
}

async function createUserProfile(profile, openId) {
  const data = {
    ...profile,
    userOpenId: openId,
    createdAt: profile.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const result = await db.collection(COLLECTIONS.users).add({ data });
  return normalizeRecord({
    ...data,
    _id: result._id
  });
}

function defaultUserProfile(openId) {
  return {
    id: openId,
    nickname: "匿名队友",
    avatar: "阵",
    avatarUrl: "",
    bio: "",
    stage: "急性期",
    joinedCommunityIds: ["squad-001", "squad-002"],
    isProfileAuthorized: false
  };
}

function sanitizeUserProfile(profile, openId) {
  const nextProfile = profile || {};
  const nickname = String(nextProfile.nickname || "匿名队友").trim().slice(0, 24) || "匿名队友";
  const avatar = String(nextProfile.avatar || nickname.slice(0, 1) || "阵").trim().slice(0, 2) || "阵";
  const avatarUrl = String(nextProfile.avatarUrl || "").trim();
  const bio = String(nextProfile.bio || "").trim().slice(0, 80);
  const stage = PROFILE_STAGES.includes(nextProfile.stage) ? nextProfile.stage : "急性期";
  const joinedCommunityIds = sanitizeCommunityIds(nextProfile.joinedCommunityIds);

  return {
    id: openId,
    nickname,
    avatar,
    avatarUrl,
    bio,
    stage,
    joinedCommunityIds,
    isProfileAuthorized: nextProfile.isProfileAuthorized === true
  };
}

function sanitizeCommunityIds(value) {
  if (!Array.isArray(value)) {
    return ["squad-001", "squad-002"];
  }

  return Array.from(new Set(value.filter((id) => COMMUNITY_IDS.includes(id))));
}

function sanitizeReport(report) {
  const nextReport = report || {};
  const targetType = ["post", "comment"].includes(nextReport.targetType) ? nextReport.targetType : "post";
  const reason = String(nextReport.reason || "other").trim().slice(0, 32) || "other";
  const reasonText = String(nextReport.reasonText || "其他问题").trim().slice(0, 32) || "其他问题";
  const targetId = String(nextReport.targetId || "").trim().slice(0, 80);

  if (!targetId) {
    throw new Error("missing report target");
  }

  return {
    id: String(nextReport.id || "").trim().slice(0, 80),
    targetType,
    targetId,
    reason,
    reasonText,
    description: String(nextReport.description || "").trim().slice(0, 200),
    status: "pending",
    createdAt: nextReport.createdAt || new Date().toISOString()
  };
}

async function updateReportStatus(id, status, openId) {
  const targetId = String(id || "").trim();
  const nextStatus = ["pending", "reviewing", "resolved", "dismissed"].includes(status) ? status : "resolved";
  const result = await db.collection(COLLECTIONS.reports)
    .where({
      userOpenId: openId,
      id: targetId
    })
    .limit(1)
    .get();
  const existing = result.data[0];

  if (!existing) {
    throw new Error("report not found");
  }

  await db.collection(COLLECTIONS.reports).doc(existing._id).update({
    data: {
      status: nextStatus,
      updatedAt: new Date().toISOString()
    }
  });

  return normalizeRecord({
    ...existing,
    status: nextStatus,
    updatedAt: new Date().toISOString()
  });
}

async function createRecord(collectionName, record, openId) {
  const createdAt = record.createdAt || new Date().toISOString();
  const data = {
    ...record,
    userOpenId: openId,
    createdAt,
    updatedAt: new Date().toISOString()
  };
  const result = await db.collection(collectionName).add({ data });
  return normalizeRecord({
    ...data,
    _id: result._id
  });
}

function normalizeList(records) {
  return records.map(normalizeRecord);
}

async function getPostDocument(id) {
  const result = await db.collection(COLLECTIONS.posts)
    .where(_.or([
      { _id: id },
      { id }
    ]))
    .limit(1)
    .get();
  return result.data[0] || null;
}

function normalizeRecord(record) {
  const nextRecord = {
    ...record,
    id: record.id || record._id
  };
  delete nextRecord._openid;
  delete nextRecord.userOpenId;
  return nextRecord;
}

function isVisibleRecord(record) {
  return record
    && record.isHidden !== true
    && record.moderationStatus !== "review";
}
