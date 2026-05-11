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
  settings: "ha_user_settings"
};

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
    case "getSetting":
      return getSetting(payload.key, payload.fallback, openId);
    case "setSetting":
      return setSetting(payload.key, payload.value, openId);
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
  return normalizeList(result.data);
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
  return normalizeList(result.data);
}

async function listMyRecords(collectionName, openId, direction = "desc") {
  const result = await db.collection(collectionName)
    .where({
      userOpenId: openId
    })
    .orderBy("createdAt", direction)
    .limit(100)
    .get();
  return normalizeList(result.data);
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
  return nextRecord;
}
