/**
 * Human-readable taxonomy shared by the profile extractor and ranker.
 *
 * These are weak signals, not claims. A keyword hit says "this session often
 * talks about the topic"; it does not infer that the user wants a specific
 * plugin. The recommendation reasons are worded accordingly.
 */
export const CATEGORIES = {
  agi: {
    label: 'AGI 与前沿实验',
    short: 'AGI 实验',
    keywords: ['agi', '智能体架构', '多智能体', '涌现', 'agent architecture', 'self-improve', '自治代理'],
  },
  ui: {
    label: '界面增强',
    short: '界面',
    keywords: ['界面', '侧栏', '输入框', '按钮', '布局', '样式', 'css', 'ui', '前端', '交互', '渲染', '弹窗', '面板'],
  },
  usage: {
    label: '用量与计费',
    short: '用量计费',
    keywords: ['token', '费用', '计费', '账单', '余额', '额度', '用量', '成本', '花费', 'billing', 'cost', 'quota', 'usage'],
  },
  theme: {
    label: '主题与外观',
    short: '主题',
    keywords: ['主题', '配色', '颜色', '字体', '外观', 'theme', 'palette', '暗色', '亮色', '壁纸'],
  },
  model: {
    label: '模型与账号接入',
    short: '模型接入',
    keywords: ['模型', 'provider', 'api key', 'apikey', 'deepseek', 'qwen', 'openai', 'claude', 'gemini', '推理模型', '上下文窗口', 'max tokens', 'temperature'],
  },
  identity: {
    label: '身份与通信',
    short: '身份通信',
    keywords: ['身份', '通信', 'persona', '人格', '账号', 'im', '联系人', '会话身份'],
  },
  session: {
    label: '会话与消息',
    short: '会话',
    keywords: ['会话', '消息', '对话', '上下文', '压缩', 'compact', '导出', '回放', '历史记录', 'session', 'message', 'token 超限', '上下文长度'],
  },
  memory: {
    label: '记忆与知识库',
    short: '记忆',
    keywords: ['记忆', '知识库', '长期记忆', '偏好', 'rag', '检索', '索引', '知识图谱', 'memory', 'knowledge base', '归档'],
  },
  tools: {
    label: '工具与能力',
    short: '工具',
    keywords: ['工具', '终端', '命令', '文件', '脚本', '搜索', '抓取', 'shell', 'powershell', 'bash', 'tool', 'mcp', '自动化操作'],
  },
  wsl: {
    label: 'WSL 与 Windows 互操作',
    short: 'WSL',
    keywords: ['wsl', 'windows', 'linux', 'ubuntu', '子系统', '跨系统', 'powershell', 'cmd.exe'],
  },
  browser: {
    label: '浏览器与网页',
    short: '浏览器',
    keywords: ['浏览器', '网页', '网站', 'url', 'web', 'fetch', 'http', 'https', '搜索', '爬虫', '抓取', 'playwright', 'selenium', 'cookie', '登录页'],
  },
  vision: {
    label: '视觉与多模态',
    short: '视觉',
    keywords: ['图片', '图像', '截图', '视觉', '多模态', 'ocr', '视频', 'canvas', 'image', 'vision', '照片', '生图'],
  },
  voice: {
    label: '语音与音频',
    short: '语音',
    keywords: ['语音', '录音', '音频', '朗读', '转写', '字幕', 'tts', 'stt', 'voice', 'audio', '麦克风', '会议记录'],
  },
  docs: {
    label: '文档与渲染',
    short: '文档',
    keywords: ['文档', 'pdf', 'word', 'docx', 'excel', '表格', 'ppt', 'powerpoint', 'markdown', '渲染', '报表', 'latex', '论文'],
  },
  skill: {
    label: '技能包',
    short: '技能',
    keywords: ['技能', 'skill', '技能包', '工作流模板', '提示词模板', 'prompt 模板'],
  },
  workflow: {
    label: '工作流与自动化',
    short: '工作流',
    keywords: ['工作流', '自动化', '定时', '任务', '计划', 'schedule', 'workflow', 'cron', '批处理', '编排', '报告', '日报', '周报', 'agent team', '子代理', 'subagent'],
  },
  git: {
    label: 'Git 与代码评审',
    short: 'Git',
    keywords: ['git', 'github', 'gitlab', 'commit', '提交', '分支', '合并', 'pull request', 'pr', '代码评审', 'review', 'diff', '仓库'],
  },
  notify: {
    label: '通知与集成',
    short: '通知',
    keywords: ['通知', '提醒', '飞书', '微信', '邮件', 'email', 'slack', 'telegram', 'webhook', '推送', 'toast', '消息机器人'],
  },
  dev: {
    label: '开发与运行时',
    short: '开发',
    keywords: ['开发', '调试', '构建', '编译', '测试', '运行时', '插件开发', 'typescript', 'javascript', 'node.js', 'python', 'npm', 'pnpm', 'debug', '性能'],
  },
  security: {
    label: '安全与权限',
    short: '安全',
    keywords: ['安全', '权限', '沙箱', '审批', '密钥', '凭据', '认证', '登录', '登录态', 'sandbox', 'permission', 'approval', 'credential', 'secret', 'acl', '访问被拒绝'],
  },
  remote: {
    label: '远程与移动端',
    short: '远程',
    keywords: ['远程', '手机', '移动端', '局域网', 'ssh', '服务器', '公网', 'tunnel', 'qr', '二维码', 'pwa'],
  },
  market: {
    label: '插件市场与管理',
    short: '插件管理',
    keywords: ['插件市场', '插件', '安装插件', '卸载插件', '插件管理', 'plugin', 'market', 'marketplace', 'plugin manager'],
  },
  fun: {
    label: '娱乐与桌面玩法',
    short: '娱乐',
    keywords: ['游戏', '桌宠', '娱乐', '动画', '鲸鱼', '弹幕', '彩蛋', '宠物', 'fun', 'game', 'whale'],
  },
}

/** Sessions using a tool are weak evidence for the matching plugin category. */
export const TOOL_CATEGORIES = {
  pwsh: ['dev', 'wsl'],
  bash: ['dev', 'wsl'],
  read: ['dev'],
  write: ['dev'],
  edit: ['dev'],
  str_replace_editor: ['dev'],
  web_search: ['browser'],
  web_fetch: ['browser'],
  image: ['vision'],
  view_image: ['vision'],
  subagent: ['workflow'],
  skill: ['skill'],
  todo: ['workflow'],
  goal: ['workflow'],
  job: ['workflow'],
  jobs: ['workflow'],
  mcp: ['tools'],
}

/**
 * A failure is a demand signal only when there is a plausible capability gap.
 * It is never treated as proof that a particular plugin caused or would fix it.
 */
export const PAIN_CLASSES = [
  {
    id: 'network',
    label: '网页或网络失败',
    categories: ['browser', 'tools'],
    pattern: /fetch failed|enotfound|econn(reset|refused|aborted)|etimedout|timed? ?out|network|dns|http 5\d\d|certificate|redirect|网络|超时|连接失败|无法访问/iu,
  },
  {
    id: 'permission',
    label: '权限或沙箱拦截',
    categories: ['security', 'tools'],
    pattern: /access is denied|eacces|eperm|sandbox|permission denied|not permitted|acl|权限|拒绝访问|沙箱|审批被拒|rejected/iu,
  },
  {
    id: 'path',
    label: '路径或文件不存在',
    categories: ['tools', 'dev'],
    pattern: /enoent|no such file|not found|is not recognized|cannot find path|路径|不存在|找不到文件/iu,
  },
  {
    id: 'shell',
    label: '命令执行失败',
    categories: ['tools', 'dev'],
    pattern: /\[exit code: [1-9]\d*\]|command failed|exit code [1-9]|命令失败|退出码/iu,
  },
  {
    id: 'context',
    label: '上下文或长度限制',
    categories: ['session', 'memory'],
    pattern: /context (length|window)|too many tokens|token limit|maximum context|compact|truncat|上下文.*(超|限制|长)|token.*(超|限制)|压缩/iu,
  },
  {
    id: 'model',
    label: '模型或服务异常',
    categories: ['model', 'usage'],
    pattern: /rate limit|429|overloaded|service unavailable|provider|api error|模型.*(失败|错误|不可用)|服务异常|额度不足/iu,
  },
  {
    id: 'tool',
    label: '其他工具报错',
    categories: ['tools', 'dev'],
    pattern: /iserror|tool.*error|工具.*(报错|失败)|error:/iu,
  },
]

export function categoryLabel(id) {
  return CATEGORIES[id]?.label ?? id ?? '其他'
}

export function categoryShortLabel(id) {
  return CATEGORIES[id]?.short ?? categoryLabel(id)
}

export function classifyError(text, isError) {
  if (isError && typeof text === 'string' && text.trim() === '') return PAIN_CLASSES.find(item => item.id === 'tool')
  const haystack = String(text ?? '')
  return PAIN_CLASSES.find(item => item.pattern.test(haystack)) ?? (isError ? PAIN_CLASSES.find(item => item.id === 'tool') : null)
}
