# dsh-plugin-feed v0.1.0

首个公开版本：把本机 DSH 历史变成插件市场的个性化推荐理由。

## Highlights

- 免训练、无 LLM 调用的插件推荐。
- 从用户消息、会话标题、可见助手正文、工具调用、失败结果和工作目录提取画像。
- 识别网页、权限、路径、命令、上下文、模型等失败类型。
- 5,000+ 插件目录的类别、关键词、新鲜度和 DSH 版本兼容匹配。
- 同类与同作者多样性重排。
- 设置页双列推荐流，支持全部历史、近一年、近 90 天、近 30 天。
- 收藏、取消收藏、不感兴趣，本地持久化。
- 内置目录快照，线上目录异步刷新。
- 不保存原始会话正文到反馈文件，不上传历史。

## Install

```powershell
dsh plugin --profile web add dsh-plugin-feed
```

或从 Release tarball 安装：

```powershell
dsh plugin --profile web add https://github.com/SSHOOTING/dsh-plugin-feed/releases/download/v0.1.0/dsh-plugin-feed-0.1.0.tgz
```

安装后重启 DSH Web，打开 **设置 → 猜你喜欢**。

## Verification

- `npm test`: 10 / 10 passed
- `npm run check`: 19 JS/MJS files passed
- Verified with DSH `0.2.0-rc.2`
- Real local history: 200+ sessions and 10k+ tool calls
- Catalog: 5,959 plugins with live refresh support

## Security and limits

- “吻合度” is a relative history match, not a quality, security, or compatibility rating.
- The plugin does not auto-install third-party code; cards only copy install commands.
- Conversation bodies are read only on the local machine and are not uploaded.
