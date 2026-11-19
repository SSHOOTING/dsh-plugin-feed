<div align="center">

# 猜你喜欢 · dsh-plugin-feed

**你在 DSH 里的历史 trajectory（轨迹）已经写下了你需要什么。  
安装后，你会看到一个真正按自己使用方式排出来的插件市场。**

**本插件能猜你需要，挑出来的插件都是适合你的。**

[![npm](https://img.shields.io/npm/v/dsh-plugin-feed?color=4c79b8)](https://www.npmjs.com/package/dsh-plugin-feed)
[![license](https://img.shields.io/badge/license-MIT-2c7a7b)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-0.2.0--rc.2-6d5ca8)](https://github.com/deepseek-ai/deepseek-harness)
[![no LLM](https://img.shields.io/badge/ranking-no%20LLM-c26b18)](#推荐是怎么来的)

</div>

![猜你喜欢页面示意](https://cdn.jsdelivr.net/npm/dsh-plugin-feed@0.1.0/docs/feed-preview.svg)

> 这是界面示意，数据是演示用的；真实页面只读取你本机的 DSH 会话。

## 它做什么

插件市场通常负责把插件列出来，但不负责判断“这个插件和我有没有关系”。

`dsh-plugin-feed` 补上这一步。它读取你本机的 DSH 会话历史，把最近的关注点、常用工具、经常遇到的错误整理成一个轻量画像，然后从插件目录里挑出与你更相关的条目。

你不需要先填写兴趣标签，也不需要先把历史整理成某种格式。

## 你会看到

进入 **DSH → 设置 → 猜你喜欢**，页面会分成四块：

- **你的使用画像**：扫过多少会话、多少条你发出的消息、多少次工具调用、多少条失败记录。
- **最近关注的方向**：浏览器、工具、开发、会话、记忆等类别，以及各自由历史文本命中的次数。
- **容易卡住的地方**：网页/网络失败、命令失败、权限拦截、上下文限制等真实问题。
- **双列插件卡片**：插件说明、作者、版本、推荐理由、吻合度、安装命令、收藏和不感兴趣。

时间范围可以在“全部历史”“近一年”“近 90 天”“近 30 天”之间切换。

## 推荐是怎么来的

它不做模型训练，也不生成 embedding，更不调用 LLM。每次打开页面时，插件在本机重新读一遍会话日志，即时计算一次。

| 信号 | 看什么 | 用来做什么 |
|---|---|---|
| 你的方向 | 用户消息、会话标题、助手可见正文、工具名 | 判断你最近常处理什么 |
| 你的难点 | 工具结果中的 `isError`、非零退出码、错误文本 | 找出值得补上的能力方向 |
| 你的环境 | 当前工作目录、已安装插件、当前 DSH 版本 | 排除不相关或装不上的插件 |
| 插件本身 | 标题、描述、类别、关键词、版本和发布时间 | 建立插件画像 |
| 反馈 | 收藏、不感兴趣 | 调整后续推荐 |

排序时会综合类别匹配、关键词重合、失败类型、新鲜度和质量信息，再对同类插件和同作者插件做降权，避免第一屏被一个方向占满。

“吻合度”只表示它和你的历史有多接近，不是插件质量、安全或兼容性的评分。

## 为什么每个人看到的会不一样

热门榜回答的是“大家最近在装什么”，这里回答的是“你最近在做什么”。

例如，你的历史里经常出现网页抓取和网络超时，推荐理由可能会写成：

```text
你记录过多次「网页或网络失败」，这个方向与插件能力吻合
你最近常处理「浏览器与网页」，所以优先展示相关插件
```

理由来自本地统计，所以能看见、能解释，也能随着你的使用变化。

## 不会做什么

- 不训练模型，不生成 embedding，不调用 LLM。
- 不读取 API Key 或凭据文件。
- 不把原始会话正文写进反馈文件。
- 不上传历史，不连接第三方分析服务。
- 不替用户执行第三方安装；卡片只复制安装命令。

插件只在内存里保留类别权重、关键词权重、失败类型计数和统计数据。收藏与“不感兴趣”状态保存在本地 JSON 中，记录的是插件名，不是对话内容。

## 安装

### npm

```powershell
dsh plugin --profile web add dsh-plugin-feed
```

### 本地开发链接

```powershell
dsh plugin --profile web add link:E:/programs/dsh-plugin-feed
```

安装完成后重启一次 DSH Web，然后打开 **设置 → 猜你喜欢**。

## 已验证

| 项目 | 结果 |
|---|---|
| `npm test` | 10 / 10 通过 |
| 语法检查 | 19 个 JS / MJS 文件通过 |
| 真实 DSH | `0.2.0-rc.2` 设置页加载成功 |
| 真实历史 | 200+ 会话、万级工具调用可完成扫描 |
| 插件目录 | 5,959 个插件，支持线上刷新 |
| 兼容过滤 | 已安装、明确不兼容、已下架、已不感兴趣自动排除 |
| 交互 | 时间筛选、收藏、取消收藏均已实际验证 |

## 配置

默认配置通常已经够用。需要调整时，在 profile 的 `cordis.patch.yml` 中覆盖：

<details>
<summary><strong>展开配置</strong></summary>

```yaml
- id: plugin-feed
  name: dsh-plugin-feed
  config:
    userId: local-first-user
    sessionsRoot: 'E:/program/DeepSeek/.dsh/sessions'
    profileDir: 'E:/program/DeepSeek/.dsh/profiles/web'
    catalogUrl: 'https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json'
    catalogCachePath: 'E:/programs/dsh-plugin-feed/data/catalog-cache.json'
    feedbackPath: 'E:/programs/dsh-plugin-feed/data/feedback.json'
    maxSessions: 600
    feedSize: 24
    catalogRefreshHours: 24
    hostVersion: '0.2.0-rc.2'
```

| 字段 | 含义 |
|---|---|
| `userId` | 推荐系统里的用户 ID；当前首用户固定为 `local-first-user` |
| `sessionsRoot` | DSH 会话日志目录 |
| `profileDir` | 当前 profile 目录，用于识别已安装插件和宿主版本 |
| `catalogUrl` | 插件目录 JSON 地址 |
| `catalogCachePath` | 线上目录更新后的本地缓存路径 |
| `feedbackPath` | 收藏和不感兴趣状态 |
| `maxSessions` | 最多扫描多少个最新会话 |
| `feedSize` | 默认卡片数量 |
| `catalogRefreshHours` | 线上目录刷新间隔 |
| `hostVersion` | 手动覆盖宿主版本；通常会自动读取 |

</details>

## HTTP 接口

### `GET /dsh-plugin-feed/feed`

支持参数：

- `days=0|30|90|365`
- `limit=1..60`
- `refresh=1`
- `seed=<string>`

### `POST /dsh-plugin-feed/feedback`

```json
{
  "name": "@owner/plugin-name",
  "action": "save"
}
```

`action` 支持 `save`、`unsave`、`dismiss`、`undismiss`，只接受同源请求。

## 目录与离线兜底

包里带了一份压缩后的目录快照 `data/catalog.seed.json.gz`，所以首次打开即使没有网络也能看到插件流。

- 线上目录可访问时，会异步更新并写入本地缓存；
- 更新失败时继续使用内置快照，并在页面上提示；
- 只对能解析的 `engines.dsh` 范围做兼容过滤；
- 无法解析的版本范围不会被武断隐藏。

## 边界

- 当前只有单用户，没有跨用户协同过滤。
- 不提供一键安装，避免直接执行第三方代码。
- 插件描述属于第三方内容，安装前仍应查看源码、权限和版本要求。
- 首次全量构建可能需要几秒，之后使用 5 分钟进程内缓存。

## 开发

```powershell
npm test
npm run check
npm run build:seed
npm run feed:scan -- --limit 15
```

核心代码：

- [用户画像与失败提取](src/profile.js)
- [免训练推荐排序](src/recommender.js)
- [插件目录加载](src/catalog.js)
- [设置页 UI](src/client.js)

## License

MIT
