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

### UrgeRecord

- `id`: 冲动缓冲记录 ID
- `reason`: 冲动类型
- `reasonText`: 冲动类型文案
- `draft`: 用户先存下、不发送的内容
- `createdAt`: 创建时间
- `delayMinutes`: 建议延迟决策分钟数
- `hasSafetyRisk`: 是否命中安全提醒
- `safetyNotice`: 安全提醒文案

### ReviewRecord

- `id`: 复盘记录 ID
- `intent`: 联系目的
- `intentText`: 联系目的文案
- `wait`: 已等待时长
- `waitText`: 已等待时长文案
- `urgeLevel`: 冲动强度，1-5
- `hasPracticalReason`: 是否有现实事务必要性
- `draft`: 想联系 TA 的草稿
- `decision`: 决策辅助结果
- `hasSafetyRisk`: 是否命中安全提醒
- `createdAt`: 创建时间

## Services

所有服务首版返回 Promise。配置云开发环境后，用户生成数据优先通过云函数写入云数据库；未配置云环境或云函数失败时，回退到本地 mock 和 `wxStorage`。

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
- `supportService.getUrgeRecords()`
- `supportService.createUrgeRecord(payload)`
- `supportService.detectSafetyRisk(value, reason)`
- `reviewService.getReviewRecords()`
- `reviewService.createContactDecision(payload)`
- `cloudfunctions/dataStore`
- `cloudfunctions/aiAgent`
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

当前云边界已建立：

- 页面层仍只调用 `services/`。
- `services/` 通过 `utils/cloudApi.js` 调用云函数。
- `dataStore` 云函数负责云数据库读写。
- `aiAgent` 云函数负责服务端 AI 推理，前端不保存 API Key。
