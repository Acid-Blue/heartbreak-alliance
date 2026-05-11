const { agentMessages } = require("./mockData");
const { createLocalId } = require("../utils/id");
const localStore = require("../utils/localStore");

const LOCAL_MESSAGES_KEY = "heartbreakAlliance.agentMessages";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getAgentMessages() {
  return Promise.resolve(clone(agentMessages.concat(getLocalMessages())));
}

function sendAgentMessage(payload) {
  const userMessage = {
    id: createLocalId("msg-user"),
    role: "user",
    content: payload.content,
    source: "用户输入",
    createdAt: new Date().toISOString()
  };

  const reply = {
    id: createLocalId("msg-agent"),
    role: "agent",
    content: buildMockReply(payload.content),
    source: "基于本人内容和小队公开内容",
    createdAt: new Date().toISOString()
  };

  const nextMessages = getLocalMessages().concat([userMessage, reply]);
  localStore.write(LOCAL_MESSAGES_KEY, nextMessages);

  return Promise.resolve(clone({ userMessage, reply }));
}

function getLocalMessages() {
  return localStore.readArray(LOCAL_MESSAGES_KEY);
}

function buildMockReply(content) {
  const trimmed = (content || "").trim();
  const focus = trimmed.length > 18 ? `${trimmed.slice(0, 18)}...` : trimmed || "这件事";
  return `我先接住你说的“${focus}”。这听起来不是小事，也不需要立刻被解决。你可以先写下：这个念头最强烈的时候，你真正想得到的是回应、解释，还是一个确定的结束？`;
}

module.exports = {
  getAgentMessages,
  sendAgentMessage
};
