# QANTO 问答页部署说明（新手版）

## 你现在要走的路线
- 前端：Vercel（免费）
- API：Vercel Serverless Functions（免费额度）
- 域名：阿里云 `qanto.top`

这样只需要一个新增平台（Vercel，用 GitHub 账号登录）。

## 本地开发
1. 构建知识库索引
- `npm run kb:build`

2. 启动前后端
- `npm run dev`
- 前端: `http://127.0.0.1:9999`
- API: `http://127.0.0.1:8787`

## 发布前必须知道
- 线上环境读取的是仓库里的 `server/data/kb-index.json`。
- 线上不能访问你电脑里的 `F:\...` 路径。
- 所以发布前先在本地执行一次 `npm run kb:build`，再把 `server/data/kb-index.json` 提交到 GitHub。

## 环境变量（Vercel）
至少配置：
- `LLM_API_URL`
- `LLM_API_KEY`
- `LLM_MODEL`

建议同时配置：
- `RAG_USE_LLM_ON_HIT=true`
- `RAG_TOP_K=4`
- `RAG_MIN_SCORE=1.1`
- `RAG_MIN_TOKEN_MATCHES=2`
- `RAG_MIN_TOKEN_COVERAGE=0.28`
- `RAG_MIN_VECTOR_SCORE=0.30`
- `RAG_VECTOR_WEIGHT=8`
- `RAG_VECTOR_DIM=256`

## API 路由
- `GET /api/health`
- `POST /api/qa`

前端默认同域请求 `/api/qa`，无需额外改地址。

## 阿里云域名绑定（qanto.top）
在 Vercel 项目添加域名后，按它给出的值在阿里云 DNS 新增记录：
- 主域名 `@`：通常是 `A` 或 `ALIAS/ANAME`（按 Vercel 提示填）
- 子域名 `www`：通常是 `CNAME` 指向 Vercel 提示目标

生效后即可通过 `https://qanto.top` 访问。

## 安全提醒
- API Key 只放在 Vercel 环境变量，不要写进前端代码。
- 如果 Key 曾在聊天/截图中出现，建议立即重置。
