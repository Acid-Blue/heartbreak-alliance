const { agentMessages } = require("./mockData");
const { createLocalId } = require("../utils/id");
const localStore = require("../utils/localStore");
const postService = require("./postService");
const userService = require("./userService");

const LOCAL_MESSAGES_KEY = "heartbreakAlliance.agentMessages";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getAgentMessages() {
  return Promise.resolve(clone(agentMessages.concat(getLocalMessages())));
}

function sendAgentMessage(payload) {
  const content = (payload.content || "").trim();

  const userMessage = {
    id: createLocalId("msg-user"),
    role: "user",
    content,
    source: "用户输入",
    createdAt: new Date().toISOString()
  };

  return buildAgentContext().then((context) => {
    const reply = {
      id: createLocalId("msg-agent"),
      role: "agent",
      content: buildMockReply(content, context),
      source: context.sourceText,
      createdAt: new Date().toISOString()
    };

    const nextMessages = getLocalMessages().concat([userMessage, reply]);
    localStore.write(LOCAL_MESSAGES_KEY, nextMessages);

    return clone({ userMessage, reply });
  });
}

function getLocalMessages() {
  return localStore.readArray(LOCAL_MESSAGES_KEY);
}

function buildAgentContext() {
  return userService.getCurrentUser().then((user) => {
    const permissions = user.agentPermissions || {};
    const tasks = [];

    tasks.push(permissions.ownContent ? postService.getMyPosts() : Promise.resolve([]));
    tasks.push(permissions.ownContent ? postService.getMyComments() : Promise.resolve([]));
    tasks.push(permissions.publicCommunityContent ? postService.getFeed() : Promise.resolve([]));

    return Promise.all(tasks).then(([myPosts, myComments, publicPosts]) => {
      const joinedCommunityIds = user.joinedCommunityIds || [];
      const joinedPublicPosts = publicPosts.filter((post) => joinedCommunityIds.includes(post.communityId));
      const sourceText = buildSourceText(permissions);

      return {
        permissions,
        sourceText,
        myPosts,
        myComments,
        publicPosts: joinedPublicPosts
      };
    });
  });
}

function buildSourceText(permissions) {
  const sources = [];

  if (permissions.ownContent) {
    sources.push("本人发布和回应");
  }

  if (permissions.publicCommunityContent) {
    sources.push("小队公开内容");
  }

  return sources.length > 0 ? `基于${sources.join("、")}` : "仅基于本次输入";
}

function summarizePosts(posts) {
  return posts.slice(0, 2).map((post) => `${post.typeText || "内容"}:${post.emotion || "未标注"}「${truncate(post.content, 18)}」`);
}

function summarizeComments(comments) {
  return comments.slice(0, 2).map((comment) => `回应「${truncate(comment.content, 18)}」`);
}

function truncate(value, length) {
  const text = value || "";
  return text.length > length ? `${text.slice(0, length)}...` : text;
}

function buildMockReply(content, context) {
  const trimmed = (content || "").trim();
  const focus = trimmed.length > 18 ? `${trimmed.slice(0, 18)}...` : trimmed || "这件事";
  const contextLines = summarizePosts(context.myPosts)
    .concat(summarizeComments(context.myComments))
    .concat(summarizePosts(context.publicPosts));
  const contextHint = contextLines.length > 0
    ? `我也看到一些上下文：${contextLines.join("；")}。`
    : "你现在没有开启更多上下文参考，我会只基于这次输入回应。";

  return `我先接住你说的“${focus}”。${contextHint}这听起来不是小事，也不需要立刻被解决。你可以先写下：这个念头最强烈的时候，你真正想得到的是回应、解释，还是一个确定的结束？`;
}

module.exports = {
  getAgentMessages,
  buildAgentContext,
  sendAgentMessage
};
