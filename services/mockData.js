const currentUser = {
  id: "user-001",
  nickname: "匿名队友",
  avatar: "阵",
  joinedCommunityIds: ["squad-001", "squad-002"],
  agentConsent: true
};

const communities = [
  {
    id: "squad-001",
    name: "断联观察小队",
    summary: "一起度过最想联系对方的时段，把冲动先交给小队和 Agent。",
    memberCount: 128,
    activeToday: 23,
    tags: ["断联", "夜间陪伴", "互相提醒"],
    mood: "安静但有人回应",
    isJoined: true
  },
  {
    id: "squad-002",
    name: "复盘重建小队",
    summary: "把关系里的反复拉扯写清楚，慢慢恢复判断和生活节奏。",
    memberCount: 96,
    activeToday: 18,
    tags: ["复盘", "自我效能", "生活秩序"],
    mood: "适合长文和认真回应",
    isJoined: true
  },
  {
    id: "squad-003",
    name: "晚安互助小队",
    summary: "睡前不硬撑，留下今天的一点情绪，也接住别人的一点情绪。",
    memberCount: 214,
    activeToday: 41,
    tags: ["睡前", "倾诉", "即时支持"],
    mood: "温和、慢回复",
    isJoined: false
  }
];

const posts = [
  {
    id: "post-001",
    communityId: "squad-001",
    authorName: "第七天",
    type: "vent",
    typeText: "倾诉",
    emotion: "反复想联系",
    content: "今天差点点开聊天框。写到这里的时候，我发现自己其实不是想复合，只是害怕这个晚上没人知道我还在难过。",
    createdAt: "2026-05-05T08:10:00+08:00",
    commentCount: 2,
    visibility: "小队可见"
  },
  {
    id: "post-002",
    communityId: "squad-002",
    authorName: "慢慢复盘",
    type: "review",
    typeText: "复盘",
    emotion: "清醒一点",
    content: "我把上一次争吵拆开看，发现我一直在证明自己值得被选。今天先把这个念头放下，去完成一件自己的小事。",
    createdAt: "2026-05-05T07:30:00+08:00",
    commentCount: 2,
    visibility: "小队可见"
  },
  {
    id: "post-003",
    communityId: "squad-003",
    authorName: "今晚早点睡",
    type: "advice",
    typeText: "求建议",
    emotion: "睡不着",
    content: "大家会怎么处理夜里突然涌上来的回忆？我想找一个不伤害自己的办法，把今晚先过去。",
    createdAt: "2026-05-04T23:42:00+08:00",
    commentCount: 2,
    visibility: "小队可见"
  }
];

const comments = [
  {
    id: "comment-001",
    postId: "post-001",
    authorName: "慢慢来",
    content: "你把“想联系”和“想被知道”分开了，这一步已经很清楚。今晚可以先把聊天框换成给自己写三句话。",
    createdAt: "2026-05-05T08:18:00+08:00"
  },
  {
    id: "comment-002",
    postId: "post-001",
    authorName: "守住今晚",
    content: "我也会在晚上最容易动摇。你可以先把手机放远一点，来小队里多写几句，我们陪你把这一阵过去。",
    createdAt: "2026-05-05T08:26:00+08:00"
  },
  {
    id: "comment-003",
    postId: "post-002",
    authorName: "不再自证",
    content: "“证明自己值得被选”这句话很重，也很准。今天完成自己的小事，就是把注意力慢慢拿回来。",
    createdAt: "2026-05-05T07:45:00+08:00"
  },
  {
    id: "comment-004",
    postId: "post-002",
    authorName: "清单队友",
    content: "复盘到这里可以先停一下，给自己留一个很小的任务，比如吃一顿正常的饭或整理桌面。",
    createdAt: "2026-05-05T08:02:00+08:00"
  },
  {
    id: "comment-005",
    postId: "post-003",
    authorName: "今晚早点睡",
    content: "我会开一个很短的白噪音，然后把突然出现的回忆写成标题，不继续展开。先让身体知道现在是安全的。",
    createdAt: "2026-05-04T23:49:00+08:00"
  },
  {
    id: "comment-006",
    postId: "post-003",
    authorName: "夜间值班",
    content: "可以试试把“今晚只负责睡前一小时”当目标，不要求自己彻底不想，只减少继续翻旧记录的动作。",
    createdAt: "2026-05-05T00:03:00+08:00"
  }
];

const agentMessages = [
  {
    id: "msg-001",
    role: "agent",
    content: "我会参考你自己的发言和阵线小队里的公开内容，帮你整理情绪线索。今天可以先从一个具体时刻说起。",
    source: "系统说明",
    createdAt: "2026-05-05T08:00:00+08:00"
  },
  {
    id: "msg-002",
    role: "agent",
    content: "看到你最近提到“夜里更难熬”。如果愿意，我们可以把今晚最强烈的念头写成一句话，再看看它背后真正需要的是什么。",
    source: "基于本人内容和小队公开内容",
    createdAt: "2026-05-05T08:04:00+08:00"
  }
];

module.exports = {
  currentUser,
  communities,
  posts,
  comments,
  agentMessages
};
