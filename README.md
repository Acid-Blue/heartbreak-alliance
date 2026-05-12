# 失恋阵线联盟

微信原生小程序 MVP 框架，围绕“阵线小队 + 同伴分享 + 个人 Agent 关怀”搭建。

## 开发方式

1. 使用微信开发者工具导入本目录。
2. AppID 可先使用测试号或在 `project.config.json` 中替换。
3. 云函数和云数据库边界已接入；`app.js` 中 `CLOUD_ENV_ID` 为空时不会初始化云能力，会回退到本地 mock 和 `wxStorage`。

## 云持久化与 AI

云函数边界已预留并实现，配置方式见 `docs/cloud-ai-setup.md`。

- `cloudfunctions/dataStore`：个人资料和用户生成数据的云数据库读写。
- `cloudfunctions/aiAgent`：服务端 AI 推理，API Key 仅放在云函数环境变量中。
- 未配置 `CLOUD_ENV_ID` 时，小程序继续使用本地 mock 和 `wxStorage` 兜底。

## Spec

正式规范位于 `docs/spec/`，后续功能开发应先更新 spec，再实现对应页面、服务和验收项。
