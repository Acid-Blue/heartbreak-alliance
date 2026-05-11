# Data Spec

## Models

### User

- `id`: 用户 ID
- `nickname`: 昵称
- `avatar`: 头像占位
- `joinedCommunityIds`: 已加入阵线小队 ID
- `agentConsent`: 是否允许 Agent 参考本人内容和小队公开内容
- `agentPermissions`: Agent 授权范围
- `agentPermissions.ownContent`: 是否允许参考本人发布和回应
- `agentPermissions.publicCommunityContent`: 是否允许参考所在小队公开内容

### Community

- `id`: 阵线小队 ID
- `name`: 小队名称
- `summary`: 简介
- `memberCount`: 成员数
- `tags`: 标签
- `mood`: 小队当前氛围
- `isJoined`: 是否加入

### Post

- `id`: 帖子 ID
- `communityId`: 所属小队 ID
- `authorName`: 作者昵称
- `type`: `vent` | `review` | `advice`
- `emotion`: 情绪标签
- `content`: 正文
- `createdAt`: 创建时间
- `commentCount`: 评论数
- `visibility`: 可见范围

### Comment

- `id`: 回应 ID
- `postId`: 所属帖子 ID
- `authorName`: 作者昵称
- `content`: 回应正文
- `createdAt`: 创建时间

### AgentMessage

- `id`: 消息 ID
- `role`: `user` | `agent`
- `content`: 消息正文
- `source`: 消息来源说明
- `createdAt`: 创建时间

## Services

所有服务首版返回 Promise。初始数据来源为本地 mock，用户在本机创建的帖子、回应和 Agent 对话通过 `wxStorage` 持久化。

- `communityService.getCommunities()`
- `communityService.getFeaturedCommunities()`
- `communityService.getCommunity(id)`
- `postService.getFeed()`
- `postService.getPost(id)`
- `postService.getPostsByCommunity(communityId)`
- `postService.getCommentsByPost(postId)`
- `postService.getMyComments()`
- `postService.createPost(payload)`
- `postService.createComment(payload)`
- `agentService.getAgentMessages()`
- `agentService.buildAgentContext()`
- `agentService.sendAgentMessage(payload)`
- `userService.getCurrentUser()`
- `userService.getJoinedCommunities()`
- `userService.getMyPosts()`
- `userService.updateAgentPermissions(patch)`

## Routes

- `pages/community/detail?id=<communityId>`
- `pages/post/detail?id=<postId>`
- `pages/publish/index?communityId=<communityId>`
- `pages/agent/index?communityId=<communityId>`

## Cloud Boundary

后续接入云开发时，应优先替换 services 内部实现，页面层不直接调用 `wx.cloud.database()`、云函数或存储实现。
