# QANTO 问答页 RAG 部署说明

## 本地开发
1. 构建知识库索引
- `npm run kb:build`

2. 启动前后端
- `npm run dev`
- 前端: `http://127.0.0.1:9999`
- API: `http://127.0.0.1:8787`

## 当前知识库来源
- `.env.local` 中 `KB_SOURCE_PATH` 默认是：
- `F:\个人知识库\02-学习\04-赵逍遥AI课`

## 接口逻辑
- 命中知识库：返回 `source = kb_rag`
- 未命中知识库：如果配置了模型 API，返回 `source = llm`
- 未命中且未配置模型 API：返回 `source = none`

## 配置大模型 HTTP 回退
在 `.env.local` 填：
- `LLM_API_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- 可选 `LLM_API_FORMAT=openai-chat|openai-responses`

## 发布到网站时怎么处理
关键点：发布环境通常**读不到你本机 F 盘路径**。

推荐方式：
1. 把知识库内容同步到服务器可访问目录（或仓库内目录），例如 `./kb-content`。
2. 在服务器环境变量中设置 `KB_SOURCE_PATH=./kb-content`。
3. 部署前运行 `npm run kb:build` 生成 `server/data/kb-index.json`。
4. 启动 API 服务（`node server/api-server.mjs`）并让前端同域访问 `/api/qa`。
5. 把 `LLM_API_KEY` 只放在服务端环境变量，不要放前端代码。

## RAG 参数
- `RAG_TOP_K`：检索召回条数（默认 4）
- `RAG_MIN_SCORE`：命中阈值（默认 1.1）
- `RAG_USE_LLM_ON_HIT`：命中后是否仍走模型生成（默认 false）
