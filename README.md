# 我要当作者 Web

面向小说创作者的 AI 写作工作台。项目把“创意输入、大纲生成、作品管理、章节写作、章节上下文维护、AI 辅助生成、管理员配置与用量监控”串成一条完整创作链路，适合本地部署、私有化使用和继续二次开发。

## 项目定位

本项目不是单纯的登录模板，而是一个完整的小说创作 SaaS 原型：

- 作者可以从一个创意开始，选择题材、平台风格、目标字数和参考书名，生成小说大纲。
- 系统会把大纲转成作品，进入作品详情页和章节写作页。
- 写作页支持正文自动保存、AI 生成正文、摘要、大纲、细节设定提取与编辑。
- 管理员可以管理创作页选项、热门模板、AI 模型路由、用户账号和 AI 调用统计。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma 7
- PostgreSQL
- Tailwind CSS 4
- lucide-react 图标
- nodemailer 邮件发送
- OpenAI-compatible 文本模型接口

## 核心功能

### 账号与权限

- 邮箱密码登录。
- 邮箱验证码注册。
- 邮箱验证码找回密码。
- HttpOnly Cookie 会话。
- `/dashboard` 及其子页面登录保护。
- 管理员白名单：通过 `ADMIN_EMAILS` 或 `ADMIN_EMAIL` 控制。
- 开发环境下未配置管理员白名单时，默认允许访问管理员工具。
- 用户编号 `code` 自动生成，便于后台管理和展示。

### 作者首页

路由：`/dashboard`

- 展示当前用户的作品库。
- 汇总总字数、累计章节、作品数量。
- 展示最近活跃作品和最新章节。
- 支持继续写作。
- 支持删除作品，带确认输入。
- 支持主题切换。
- 管理员账号可以看到全部用户作品。

### 创建作品

路由：`/dashboard/create`

创作入口包含：

- 小说类型选择。
- 自定义类型。
- 标签输入。
- 平台风格选择。
- 目标字数选择。
- DNA 参考书名输入。
- 热门模板套用。
- 创意输入。
- AI 优化创意。
- AI 创意分析。
- 前端进度反馈和错误定位。

创建页配置来自数据库中的 `AppConfig`，管理员可以在后台调整题材、平台、DNA 风格和目标字数选项。

### 大纲生成与作品创建

路由：`/dashboard/create/outline`

- 根据创意草稿调用 AI 生成完整小说大纲。
- 生成内容会写入临时缓存，避免刷新丢失。
- 大纲确认后创建正式作品。
- 作品创建后进入作品详情页。
- 大纲结构会保存到 `Work.outline`，后续写作和章节生成都会使用。

### 短篇小说一键生成
路由：`/dashboard/create/short`

- 支持短篇类型、标签、目标字数、风格、叙事视角、结局倾向和创意输入。
- 支持目标字数 3000、5000、8000、12000、20000。
- 支持结构模板：三幕式、反转式、悬疑式、爽文式、虐恋式、治愈式。
- 调用 `POST /api/ai/short-story` 一次生成标题、简介、结构化短篇大纲和完整正文。
- 生成结果保存为 `Work.workType = short_story`，并自动创建第 1 章。
- 短篇大纲会以结构化 JSON 保存到 `Work.outline` 和 `Work.rawOutline`，包括主题、钩子、结局倾向、角色、3-8 个 beats 和 `fullOutline`。
- 短篇不套用长篇分卷分章流程，后续可按短篇场景继续编辑、润色和导出。

### 作品导入

路由：`/dashboard/import`

- 支持粘贴全文导入。
- 支持读取 TXT / Markdown 文本文件。
- 支持选择长篇连载或短篇小说。
- 支持填写标题、题材、标签、平台风格和简介。
- 自动识别中文、英文和 Markdown 章节标题并切章。
- 导入前展示章节数量、每章标题、每章字数和总字数。
- 确认后创建 `Work` 和 `Chapter`，并写入基础 `WritingMemory`。

### 作品详情页

路由：`/dashboard/work/[id]`

作品详情页是作者的创作驾驶舱：

- 作品标题、题材、目标字数、平台等基础信息。
- 作品简介和核心设定。
- 分卷结构展示。
- 主要角色展示。
- 写作进度、已写章节、规划章节、剩余缓冲量。
- 继续写作主入口。
- 章节导航入口。
- 大纲延伸能力，可选择延伸 20、40、60 章。
- AI 生成中状态常驻展示。
- 故事圣经入口：集中维护角色、设定、时间线、伏笔、关系和写作记忆。
- 全书一致性检查入口：全书检查会创建 `GenerationJob` 异步任务。
- 全书 / 短篇 Markdown 导出入口。

### 故事圣经

路由：`/dashboard/work/[id]/bible`

- 角色卡：维护身份、定位、描述、当前状态和章节范围。
- 世界观设定：维护规则、地点、名词和章节范围。
- 时间线：维护事件顺序、章节、故事时间和说明。
- 伏笔墙：维护埋设章节、回收章节、状态、重要度和回收方式。
- 人物关系：维护角色间关系状态、冲突和最近变化章节。
- 写作记忆：维护事实、风格、约束、角色状态、剧情线和细节记忆。
- 支持新增、编辑、删除、搜索和按章节范围过滤。
- 支持从指定章节调用 AI 提取上下文并写入故事圣经。

### 章节写作页

路由：`/dashboard/work/[id]/chapter/[index]`

写作页以正文为核心，右侧为上下文工具：

- 自动创建缺失章节。
- 章节标题和正文编辑。
- 自动保存正文、标题、摘要、大纲和细节设定。
- 保存中、已保存、错误、AI 生成中状态展示。
- 正文复制。
- 上下文预览。
- 统一章节入口：当前章节下拉即章节导航、搜索、切章和新增入口。
- `Ctrl/Cmd + K` 打开同一个章节导航面板。
- 空正文时，摘要、大纲、细节提取不会误触发 AI，错误会显示在对应按钮上。
- 首次生成正文不要求补充提示词。
- 二次生成正文才会打开补充提示词确认。
- AI 生成正文时不再卡住弹窗，而是在编辑页内展示进度。
- 摘要、大纲、细节设定可以并行生成，不互相阻塞。

右侧上下文工具包含：

- 本章目标。
- 章节摘要。
- 章节大纲。
- 细节设定。
- 生成、重新生成、编辑、提取等操作。
- 默认折叠，点击展开。
- 右栏与正文区保持同页面滚动，不再使用独立滚动容器。

### 章节 AI 能力

AI 章节能力分为四类：

- 正文生成：`/api/ai/chapter`
- 章节摘要：`/api/ai/chapter/summary`
- 章节大纲：`/api/ai/chapter/outline`
- 细节提取：`/api/ai/chapter/details`
- 章节 AI 改写：`/api/ai/chapter/rewrite`
- AI 一致性检查：`/api/ai/chapter/consistency`

章节 AI 改写支持：

- AI 改写正文：可整章改写，也可选中文本后局部改写。
- AI 逻辑检查：只输出矛盾、动机和衔接风险，不直接覆盖正文。
- 改写模式：扩写、压缩、爽文化、细腻化、去 AI 味、增强开头钩子、增强结尾追读感、对话自然化、小红书风、番茄风、短剧化等。
- 预览后应用：先生成预览，确认后再写入正文。
- 应用前自动保存历史版本：应用改写前会生成章节历史快照，便于回退。

AI 一致性检查支持：

- 角色矛盾检查。
- 时间线矛盾检查。
- 设定冲突检查。
- 剧情断裂检查。
- 风格偏移检查。
- 强约束遗漏检查。
- 支持检查当前章、最近 5 章。
- 全书检查通过 `GenerationJob` 异步记录。
- 输出高危问题、中危问题、建议和后续 AI 改写提示词。
- 只展示评分和修改建议，不自动改写正文。

### 导出

- 当前章节导出 TXT / Markdown。
- 全书导出 TXT / Markdown。
- 短篇导出 TXT / Markdown。
- 导出按章节顺序排列，并过滤 `deletedAt` 不为空的章节。
- 导出文件名包含作品名、范围和日期。
- DOCX / EPUB 接口已预留。

正文生成会参考：

- 作品基础信息。
- 总大纲。
- 当前章节。
- 前文上下文。
- 章节摘要。
- 章节大纲。
- 细节设定。
- 用户补充提示词。

摘要、大纲、细节提取都会要求已有正文内容，避免空正文生成出不可信的元信息。

### 管理员控制台

路由：`/dashboard/admin`

管理员控制台包含：

- 实时 AI 数据监控。
- 今日调用统计。
- 今日 Token 消耗。
- 总调用次数。
- 总 Token 消耗。
- 服务商 Token 排行。
- 模型 Token 排行。
- 创作页配置管理。
- 热门模板管理。
- 热门模板学习。
- 配置自动保存。

### AI 模型配置

路由：`/dashboard/admin/ai-model`

支持为不同任务配置不同服务商和模型：

- 创意生成。
- 创意分析。
- 大纲生成。
- 章节正文生成。
- 章节摘要生成。
- 章节大纲生成。
- 细节设定提取。
- 模板学习。
- 全量重生成。

### 提示词模板中心

路由：`/dashboard/admin/prompts`

- 使用 `PromptTemplate` 模型管理 AI 提示词。
- 支持按 category 查看提示词。
- 支持新增提示词、编辑提示词、创建新版本。
- 支持启用 / 停用版本，并查看当前激活版本。
- AI 调用优先读取数据库激活提示词，找不到时回退到代码默认提示词。

目前内置两个服务商槽位：

- `primary`：主线路，读取 `AI_*` 环境变量。
- `ark`：备用线路，读取 `ARK_*` 环境变量。

底层适配 OpenAI-compatible 接口，支持 Chat Completions 和 Responses 两种形态，并带有：

- 服务商优先级。
- endpoint fallback。
- 模型名兼容处理。
- reasoning 参数不兼容时自动降级。
- 可重试状态码重试。
- Token 用量解析。
- 调用耗时记录。

### 用户管理

路由：`/dashboard/admin/users`

管理员可以：

- 搜索用户。
- 分页查看用户。
- 新增用户。
- 编辑邮箱、昵称、验证状态。
- 重置密码。
- 生成临时密码。
- 删除用户。

### 热门模板系统

热门模板用于创作页快速填入创意：

- 按题材归类。
- 支持模板启用和停用。
- 支持使用次数统计。
- 支持管理员新增、编辑、删除。
- 支持 AI 学习生成模板。
- 用户使用模板会记录使用事件。

## 数据模型

主要 Prisma 模型：

- `User`：用户账号、邮箱、密码哈希、用户编号、登录时间。
- `EmailVerificationCode`：注册和找回密码验证码。
- `AppConfig`：创作页配置和 AI 模型配置。
- `CreateTemplate`：热门创意模板。
- `CreateTemplateUsage`：模板使用记录。
- `IdeaGenerationEvent`：创意生成记录。
- `AiUsageEvent`：AI 调用统计、Token、耗时、模型和服务商。
- `Work`：作品主体、创意、大纲、简介、题材、平台、目标字数。
- `Chapter`：章节正文、标题、字数、摘要、大纲、细节设定。

## 页面路由

| 路由 | 功能 |
| --- | --- |
| `/` | 根据登录状态跳转到登录页或工作台 |
| `/login` | 登录 |
| `/register` | 注册 |
| `/forgot-password` | 找回密码 |
| `/dashboard` | 作者首页和作品库 |
| `/dashboard/create` | 创建作品第一步 |
| `/dashboard/create/short` | 短篇小说一键生成入口 |
| `/dashboard/create/outline` | AI 生成大纲和创建作品 |
| `/dashboard/import` | 导入作品，支持粘贴全文、TXT / Markdown、自动切章和导入预览 |
| `/dashboard/work/[id]` | 作品详情页 |
| `/dashboard/work/[id]/bible` | 故事圣经页面 |
| `/dashboard/work/[id]/chapter/[index]` | 章节写作页 |
| `/dashboard/admin` | 管理员控制台 |
| `/dashboard/admin/users` | 用户管理 |
| `/dashboard/admin/ai-model` | AI 模型配置 |
| `/dashboard/admin/prompts` | 提示词模板中心 |

## API 路由

### 认证

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/auth/profile`
- `POST /api/auth/register/send-code`
- `POST /api/auth/register/confirm`
- `POST /api/auth/password/send-code`
- `POST /api/auth/password/reset`

### 创作配置和模板

- `GET /api/config/create`
- `GET /api/create/templates`
- `POST /api/create/templates/use`
- `GET /api/admin/create-config`
- `PUT /api/admin/create-config`
- `GET /api/admin/templates`
- `POST /api/admin/templates`
- `PUT /api/admin/templates/[id]`
- `DELETE /api/admin/templates/[id]`
- `POST /api/admin/templates/learn`
- `GET /api/admin/prompts`
- `POST /api/admin/prompts`
- `PUT /api/admin/prompts/[id]`
- `DELETE /api/admin/prompts/[id]`

### AI

- `POST /api/ai/idea`
- `POST /api/ai/idea/analyze`
- `POST /api/ai/outline`
- `POST /api/ai/outline/refine`
- `POST /api/ai/short-story`
- `POST /api/ai/chapter`
- `POST /api/ai/chapter/summary`
- `POST /api/ai/chapter/outline`
- `POST /api/ai/chapter/details`
- `POST /api/ai/chapter/rewrite`
- `POST /api/ai/chapter/consistency`

### 作品和章节

- `GET /api/works`
- `POST /api/works`
- `POST /api/works/import/preview`
- `POST /api/works/import/confirm`
- `GET /api/works/[id]`
- `DELETE /api/works/[id]`
- `GET /api/works/[id]/chapters`
- `GET /api/works/[id]/chapters/[index]`
- `PUT /api/works/[id]/chapters/[index]`
- `GET /api/works/[id]/export`
- `GET /api/works/[id]/bible`
- `POST /api/works/[id]/bible`
- `PATCH /api/works/[id]/bible/[section]/[itemId]`
- `DELETE /api/works/[id]/bible/[section]/[itemId]`
- `POST /api/works/[id]/bible/extract`

### 管理员

- `GET /api/admin/ai-stats`
- `GET /api/admin/ai-model-config`
- `PUT /api/admin/ai-model-config`
- `GET /api/admin/prompts`
- `POST /api/admin/prompts`
- `PUT /api/admin/prompts/[id]`
- `DELETE /api/admin/prompts/[id]`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/[id]`
- `DELETE /api/admin/users/[id]`
- `POST /api/admin/users/[id]/reset-password`

### 健康检查

- `GET /api/health`

## 环境变量

项目会读取 `.env` 或 `.env.local`。

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接地址 |
| `SESSION_SECRET` | 会话签名密钥，生产环境必须使用长随机字符串 |
| `SESSION_COOKIE_SECURE` | 是否启用 Secure Cookie，生产环境建议为 `true` |
| `ADMIN_EMAILS` | 管理员邮箱白名单，多个邮箱用英文逗号分隔 |
| `ADMIN_EMAIL` | 单管理员邮箱兼容变量 |
| `MAIL_MAILER` | 邮件驱动，当前用于 SMTP |
| `MAIL_SCHEME` | 邮件协议，例如 `smtps` |
| `MAIL_HOST` | SMTP 主机 |
| `MAIL_PORT` | SMTP 端口 |
| `MAIL_USERNAME` | SMTP 用户名 |
| `MAIL_PASSWORD` | SMTP 密码或授权码 |
| `MAIL_FROM_ADDRESS` | 发件邮箱 |
| `MAIL_FROM_NAME` | 发件人名称 |
| `AI_PROVIDER_LABEL` | 主线路显示名称 |
| `AI_BASE_URL` | 主线路 OpenAI-compatible Base URL |
| `AI_API_KEY` | 主线路 API Key |
| `AI_MODEL` | 主线路默认模型 |
| `AI_MODEL_OPTIONS` | 主线路可选模型，逗号分隔 |
| `ARK_PROVIDER_LABEL` | 备用线路显示名称 |
| `ARK_BASE_URL` | 备用线路 Base URL |
| `ARK_API_KEY` | 备用线路 API Key |
| `ARK_MODEL` | 备用线路默认模型 |
| `ARK_MODEL_OPTIONS` | 备用线路可选模型，逗号分隔 |

## 本地启动

### Windows 一键启动

在 `web/` 目录运行：

```powershell
.\start-dev.cmd
```

脚本会自动执行：

- 检查 `node` 和 `npm`。
- 如果缺少 `.env`，从 `.env.example` 复制。
- 如果缺少 `node_modules`，执行 `npm install`。
- 检查 `DATABASE_URL`。
- 检查 PostgreSQL 端口。
- 确保目标数据库存在。
- 执行 `npx prisma migrate deploy`。
- 执行 `npx prisma generate`。
- 启动开发服务器。

启动后访问：

```text
http://localhost:3000
```

### 手动启动

```powershell
npm install
npx prisma migrate deploy
npm run db:generate
npm run dev
```

## 常用命令

```powershell
npm run dev          # 使用 Webpack 启动开发服务器
npm run dev:turbo    # 使用 Turbopack 启动开发服务器
npm run build        # 生成 Prisma Client 并执行 Next.js 构建
npm run start        # 启动生产构建
npm run lint         # ESLint 检查
npm run db:generate  # 生成 Prisma Client
npm run db:migrate   # 创建并应用开发迁移
npm run db:push      # 直接同步 Prisma schema 到数据库
npm run db:studio    # 打开 Prisma Studio
```

## 目录结构

```text
web/
  prisma/
    schema.prisma
    migrations/
  scripts/
    start-dev.ps1
  src/
    app/
      api/
      dashboard/
      login/
      register/
      forgot-password/
    components/
      admin/
      auth/
      create/
      dashboard/
      theme/
      workbench/
    lib/
      admin/
      ai/
      auth/
      client/
      config/
      create/
      dashboard/
      workbench/
```

## 开发约定

- `src/app/**/page.tsx` 保持轻量，只做路由容器。
- 页面 UI 放在 `src/components/<domain>/`。
- 客户端状态和业务行为放在 `src/lib/<domain>/use-*.ts`。
- API 业务入口放在 `src/app/api/**/route.ts`。
- 数据结构以 `prisma/schema.prisma` 为准。
- UI 主题、密度、暗色模式和全局视觉 token 主要在 `src/app/globals.css`。

## 验证方式

提交或部署前建议执行：

```powershell
npm run lint
npm run build
```

当前构建会先执行：

```powershell
npm run db:generate
```

然后再执行 Next.js 生产构建。

## 部署提示

生产环境至少需要：

- 可访问的 PostgreSQL 数据库。
- 正确的 `DATABASE_URL`。
- 足够随机的 `SESSION_SECRET`。
- 正确配置的 `ADMIN_EMAILS`。
- 可发送验证码的 SMTP 配置。
- 至少一个可用的 AI 服务商 API Key。
- 部署前执行 `npx prisma migrate deploy`。

## 安全注意

- 不要提交 `.env` 或 `.env.local`。
- `.env.example` 只保留占位值。
- 管理员账号通过邮箱白名单控制，生产环境必须显式配置。
- 用户密码使用哈希存储，不保存明文密码。
- 后台生成的临时密码只在创建或重置时展示一次。
- AI Key 仅在服务端读取，不应暴露到客户端。
