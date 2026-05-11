# 云持久化与 AI 推理接入

最后更新：2026-05-11

## 当前结论

项目已接入云函数边界：

- `cloudfunctions/dataStore`：负责真实云数据库读写。
- `cloudfunctions/aiAgent`：负责服务端调用 OpenAI-compatible Chat Completions API，可通过环境变量切换到 Kimi / Moonshot endpoint。

小程序前端不会保存 API Key。前端服务层会优先调用云函数；如果未配置云环境或云函数失败，会自动回退到现有本地 mock / `wxStorage` 逻辑，保证本地开发仍可运行。

## 必要配置

1. 在微信云开发中创建环境。
2. 将环境 ID 填入 `app.js` 的 `CLOUD_ENV_ID`。
3. 上传并部署云函数：
   - `cloudfunctions/dataStore`
   - `cloudfunctions/aiAgent`
4. 在 `aiAgent` 云函数环境变量中配置：
   - `OPENAI_API_KEY`：OpenAI-compatible API Key。
   - `OPENAI_BASE_URL`：可选，默认 `https://api.openai.com/v1`。接 Kimi 时填写 `https://api.moonshot.cn/v1`。
   - `OPENAI_MODEL`：可选，默认 `gpt-5`。接 Kimi 时填写实际可用模型，例如 `kimi-k2.6`。
5. 创建或授权以下云数据库集合：
   - `ha_posts`
   - `ha_comments`
   - `ha_agent_messages`
   - `ha_urge_records`
   - `ha_review_records`
   - `ha_user_settings`

## 数据持久化范围

已支持云端持久化：

- 用户发布的帖子。
- 用户提交的回应。
- Agent 对话消息。
- Agent 权限设置。
- 急性期冲动缓冲记录。
- 联系决策复盘记录。

仍使用 mock 种子数据：

- 初始用户资料。
- 初始阵线小队。
- 初始小队帖子和回应。

## AI 推理范围

Agent 发送消息时：

1. 前端构造授权范围内的上下文摘要。
2. 如果命中安全提醒，直接返回本地安全提醒，不调用 AI。
3. 如果未命中安全提醒且云环境可用，调用 `aiAgent` 云函数。
4. 如果云函数或模型请求失败，回退到本地 mock Agent 回复。

`aiAgent` 使用 OpenAI-compatible Chat Completions HTTP API，并通过服务端环境变量读取密钥。接 Kimi 时，只需要把 `OPENAI_BASE_URL` 指向 Moonshot/Kimi 的兼容接口地址。

## 验证建议

- 未配置云环境时，确认小程序仍可本地运行。
- 配置云环境后，发布帖子、回应、Agent 消息、冲动缓冲、联系决策记录应写入云数据库。
- 重新安装或清理本地缓存后，云端数据仍应能恢复。
- 移除或填错 `OPENAI_API_KEY` 时，Agent 应回退到 mock 回复。
- 配置正确 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `OPENAI_MODEL` 后，Agent 回复来源应显示 `AI推理 · ...`。

## Kimi 配置示例

在 `aiAgent` 云函数环境变量中配置：

```text
OPENAI_API_KEY=你的 Kimi / Moonshot API Key
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=kimi-k2.6
```
