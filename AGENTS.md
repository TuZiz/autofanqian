<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 西红柿 Web Agent Rules

`web/` 是真实 Next.js 应用和 Git 仓库。所有 Web 命令默认从本目录执行。根目录只做项目总控说明，不承载业务实现。

默认中文回复，先给结论，再给执行路径。用户通常要的是实际落地：改代码、修 UI、同步远端、验证页面，而不是只给建议。

## AI 最高规则

- 修改代码前必须先阅读用户需求、相关文件和同类实现。
- 必须模仿项目已有写法、命名、目录、错误处理和 UI 风格。
- 禁止凭空发明不存在的函数、类型、工具类、目录、配置字段或 API。
- 禁止大规模重构，除非用户明确要求。
- 禁止随意引入新依赖；确实需要时必须先说明原因和影响。
- 禁止修改公开 API、路由路径、配置字段、数据库字段、数据结构含义，除非用户明确要求。
- 禁止为了通过编译而降低类型安全。
- 禁止删除用户已有逻辑或覆盖用户未提交改动。
- 禁止编造测试结果。
- 禁止说已经运行测试，除非真的运行过对应命令。
- 禁止用 `git reset --hard`、`git checkout --`、`git clean` 回滚用户改动，除非用户明确要求。
- 文档任务只改文档；业务任务只改最小必要业务范围。

## TypeScript 强约束

- 禁止使用 `any`。
- 禁止使用 `as any`。
- 禁止使用 `as unknown as Xxx`。
- 禁止使用 `// @ts-ignore`。
- 禁止使用 `// @ts-expect-error`，除非已有测试场景确实需要，并且必须说明原因。
- 函数参数和返回值必须尽量明确。
- 外部输入必须先校验再使用。
- 复杂对象必须定义 `interface` 或 `type`。
- 不懂类型时必须先查已有类型、同目录代码和共享类型，不准乱写。
- 不能用类型断言欺骗编译器。
- 不能把 `unknown` 直接当业务对象使用，必须缩小类型或通过 schema 校验。

TypeScript 任务必须先阅读：

- `docs/ai/typescript-guide.md`
- `docs/ai/project-structure.md`
- `docs/ai/change-checklist.md`

## 命名规范

- 变量、函数使用 `camelCase`。
- 类型、接口、类、React 组件使用 `PascalCase`。
- 常量使用 `UPPER_SNAKE_CASE`。
- 文件名优先使用 `kebab-case`。
- React 组件文件如果项目已有不同规范，必须以项目现有规范为准。
- 命名必须表达业务含义，禁止 `data2`、`newUtil`、`tempValue` 这类含糊名字。

## 文件组织硬规则

- 新增文件前必须先查找是否已有同类模块。
- 优先放入已有目录，靠近相关业务模块。
- 禁止创建 `utils2`、`common2`、`temp`、`ai-generated`、`new-service` 这类垃圾目录。
- 禁止为了方便绕过现有架构。
- 禁止把所有工具函数都塞进一个巨大 `utils` 文件。

## AI 修改流程

1. 阅读用户需求。
2. 搜索相关文件。
3. 理解已有实现。
4. 找到同类代码风格。
5. 制定最小改动方案。
6. 修改代码。
7. 运行可用的检查命令。
8. 总结修改内容和风险。

完成任务后必须说明：改了哪些文件、为什么这样改、是否影响旧功能、是否运行检查命令、没运行的原因、还有什么风险。

## 前后端边界

- `src/app/` 只作为 Next.js 路由入口；`page.tsx` 和 `route.ts` 保持薄层。
- `src/frontend/` 放浏览器端 feature、API client、前端 hooks 和纯 UI 组合。
- `src/backend/` 放 Prisma、鉴权、AI、统计、邮件、service、repository 和上游 provider。
- `src/shared/` 放 DTO、zod schema、共享类型和共享常量。
- HTTP API 路径默认不改；迁移时优先保留旧路径兼容导出，避免一次性破坏调用方。
- 普通业务 TS/TSX 文件尽量控制在 300-400 行；`route.ts` 尽量控制在 80-150 行。超限时按容器、service、repository、schema、formatter、dialog/section 拆分。
- 前端代码不能直接 import `src/backend/*`；后端代码不能 import React 组件或浏览器 UI 模块。

## 快速工作契约

- 先看 `git status --short`，保护用户和上一轮留下的改动。
- 从用户给的截图、URL、组件名、接口名或报错入手，先查最小范围。
- 不要盲扫 `.next`、`node_modules`、`output`、日志和构建产物。
- UI 问题必须落实到用户能看见的变化；“结构已改但页面没变化”视为未完成。
- 业务代码优先遵循现有写法，少做无关抽象和大范围重命名。
- 文档或 AGENTS 调整只改说明文件，不顺手改业务代码。

## 用户产品偏好

- 这是小说创作工作台，不是通用后台模板；所有页面要服务“快速写作、规划、续写、管理配置”。
- UI 要清爽、紧凑、可扫描。避免大面积黑色、突兀蓝色、紫蓝渐变、过重装饰和营销式 hero。
- 用户常用宽屏桌面缩放看页面，信息密度和左右栏对齐很重要。
- 按钮、输入框、弹窗必须一眼看出用途；不要让可编辑区域像普通文本。
- 复制成功提示要鲜明但不突兀，按钮状态变化要清楚。
- 修改书名、个人信息、昵称、密码这类操作优先用弹窗遮罩，不跳到第二页面。
- 管理员默认页要高可编辑度：左侧导航分模块、列表摘要展示、右侧抽屉编辑、统一保存栏。避免所有大表单默认展开。
- 写作页正文区域要显示更多内容；左侧正文高度和右侧工具栏高度要协调，不要只拉长一边。

## 当前领域模型

用户语义上把作品视为 `Novel`，但代码里仍可能存在旧 `Work` 兼容层。改动前先确认实际模型和路由，不要凭名字猜。

重点概念：

- `Novel / Work`：小说主体，包含标题、简介、题材、目标字数、长期目标章数、原始大纲。
- `Volume`：卷纲，区分宏观卷纲和可写详细规划。
- `Chapter`：章节正文、摘要、章节大纲、细节、状态。
- `WritingMemory`：长期写作记忆，用于人物状态、事实约束、风格要求、未解决问题。
- `GenerationJob`：AI 生成记录、模型、耗时、错误和 prompt 快照。
- `PromptTemplate`：AI 提示词模板版本。

渐进式规划是当前重要约束：

- 不要默认一次展示或生成 1560 章详细规划。
- 初始只生成全书宏观卷纲 + 当前可写窗口。
- 默认详细窗口约 20-40 章，单次硬上限 60 章。
- 超出 `plannedUntilChapter` 的章节不能进入写作或生成。
- “延展”在 UI 中应表达为“规划下一段”。

## 架构边界

- `src/app/**/page.tsx` 保持薄：路由参数、权限/session、hook 调用和页面组合。
- UI 放在 `src/components/<domain>/`，如 `dashboard`、`workbench`、`create`、`admin`、`auth`。
- 客户端状态和行为放在 `src/lib/<domain>/use-*.ts`。
- 业务 helper、类型、解析器、格式化放在 `src/lib/<domain>/`。
- API 在 `src/app/api/**/route.ts`，数据库模型在 `prisma/schema.prisma`。
- `src/app/globals.css` 是全局主题入口。行为任务不要顺手大改全局视觉。
- 普通业务 TS/TSX 文件尽量控制在 300-400 行附近；超出时按职责拆分。

## 高频入口

### 登录与会话

- 登录页：`src/app/login/page.tsx`
- Auth UI：`src/components/auth/`
- 登录 API：`src/app/api/auth/login/route.ts`
- 登出 API：`src/app/api/auth/logout/route.ts`
- Session API：`src/app/api/auth/session/route.ts`
- Session 工具：`src/lib/auth/session.ts`
- 路由保护：`src/proxy.ts`

如果页面一直停在“正在验证身份信息”或自动刷新，优先检查 session cookie、`/api/auth/session`、`src/proxy.ts` 和数据库用户是否存在。

### Dashboard 首页

- 首页路由：`src/app/dashboard/page.tsx`
- 首页客户端：`src/components/dashboard/dashboard-client.tsx`
- 顶栏：`src/components/dashboard/dashboard-topbar.tsx`
- 外壳和作品列表：`src/components/dashboard/dashboard-shell.tsx`、`src/components/dashboard/dashboard-works-section.tsx`
- 行为 hook：`src/lib/dashboard/use-dashboard-client.ts`

个人信息入口放在顶部邮箱/用户区域，采用遮罩弹窗，不新增第二页面。

### 创建流程

- 创建页：`src/app/dashboard/create/page.tsx`
- 创建 UI：`src/components/create/`
- 创建状态：`src/lib/create/use-dashboard-create.ts`
- 类型和工具：`src/lib/create/dashboard-create-types.ts`、`src/lib/create/dashboard-create-utils.ts`
- 大纲草稿：`src/lib/create/outline-draft.ts`、`src/lib/create/outline-schema.ts`
- 渐进规划：`src/lib/create/progressive-planning.ts`
- 大纲流程：`src/app/dashboard/create/outline/page.tsx`、`src/lib/create/outline-flow.ts`

创建长篇时只生成宏观卷纲和首个详细窗口，不要把长期目标章节全部展开。

### 作品页与写作页

- 旧作品页：`src/app/dashboard/work/[id]/page.tsx`
- 旧写作页：`src/app/dashboard/work/[id]/chapter/[index]/page.tsx`
- 新小说路由：`src/app/dashboard/novel/**`
- Work/Novel API：`src/app/api/works/**`、`src/app/api/novels/**`
- Workbench UI：`src/components/workbench/`
- 作品页行为：`src/lib/workbench/use-work-dashboard.ts`
- 写作页主状态：`src/lib/workbench/use-work-chapter-editor.ts`
- AI 行为：`src/lib/workbench/use-chapter-editor-ai.ts`
- 章节元数据：`src/lib/workbench/use-chapter-editor-meta.ts`
- 导航命令：`src/lib/workbench/use-chapter-editor-navigation.ts`
- Workbench 类型：`src/lib/workbench/`

作品页标题修改应使用弹窗编辑。写作页正文必须保持明显可编辑，且选中输入框时文字不能横向跳动。

### 管理员后台

- 管理员首页：`src/app/dashboard/admin/page.tsx`
- 用户管理：`src/app/dashboard/admin/users/page.tsx`
- AI 模型配置：`src/app/dashboard/admin/ai-model/page.tsx`
- 支付设置：`src/app/dashboard/admin/payments/page.tsx`
- 规划配置 API：`src/app/api/admin/planning-config/route.ts`
- 管理员 UI：`src/components/admin/`
- 规划配置 UI：`src/components/admin/admin-planning-section.tsx`
- 管理员 hook 和类型：`src/lib/admin/`
- 配置读取：`src/lib/config/`
- 规划配置：`src/lib/config/planning.ts`

管理员页面默认自动保存，但也要有清晰状态栏。大表单改成模块导航、摘要列表、右侧抽屉编辑。

### 支付与会员

- 支付宝后台配置页：`src/app/dashboard/admin/payments/page.tsx`
- 支付宝后台 API：`src/app/api/admin/payments/alipay/route.ts`
- 支付宝配置读取：`src/lib/payments/alipay-config.ts`
- 支付宝客户端封装：`src/lib/payments/alipay-client.ts`
- 敏感配置加密：`src/lib/security/encryption.ts`
- 会员升级中心：`src/components/dashboard/dashboard-upgrade-modal.tsx`

支付安全规则：

- 支付宝应用私钥只能加密后存入 `AppConfig`，不能明文保存、不能回显给前端、不能进入前端 bundle、不能写日志。
- 后台保存私钥必须依赖 `SETTINGS_ENCRYPTION_KEY`，该值需要 32 字节以上随机字符串；未配置时返回明确错误。
- 支付成功发放会员只能在支付宝异步 notify 中做；`return_url` 只能展示结果，不能发放会员。
- 未来 notify 接口由支付宝服务器调用，不能做 same-origin 校验。
- 支付配置读取优先级：后台 `AppConfig` > `.env` fallback > 未配置报错。

### AI 与提示词

- AI API：`src/app/api/ai/**`
- AI 服务：`src/lib/ai/**`
- 客户端章节生成：`src/lib/client/chapter-generation.ts`
- 模型路由配置页：`src/app/dashboard/admin/ai-model/page.tsx`

所有 AI 功能都应能归类配置路由，模型候选名从 `.env.local` 或配置读取。当前用户已多次要求：二次生成、重新生成、摘要、大纲、细节、章节、学习模板等都要纳入统一配置视野。

### 样式与主题

- 主题切换：`src/components/theme/theme-toggle.tsx`
- 主题配置：`src/components/theme/theme-config.ts`
- 全局样式：`src/app/globals.css`

视觉优先级：浅色、清爽、紧凑、稳定。避免黑色大块、过亮蓝色边框、卡片套卡片、页面滚动被无效装饰撑大。

## 常见诊断捷径

- 自动保存、章节保存、字数、复制、正文编辑：先看 `src/lib/workbench/use-*.ts`，再看 `src/components/workbench/`。
- 作品页大纲、规划下一段、章节可写范围：先看 `src/lib/workbench/use-work-dashboard.ts`、`src/components/workbench/work-dashboard-*`、`src/lib/create/progressive-planning.ts`。
- 书名、简介、标签无法修改：先看作品页组件和 `src/app/api/works/[id]/route.ts` 或 `src/app/api/novels/[id]/route.ts`。
- 登录循环或验证闪烁：先看 `src/app/api/auth/session/route.ts`、`src/lib/auth/session.ts`、`src/proxy.ts`。
- 管理员保存和自动保存：先看 `src/lib/admin/use-dashboard-admin.ts`、`src/components/admin/`、`src/app/api/admin/**`。
- Prisma drift 或迁移问题：先看 `prisma/schema.prisma`、`prisma/migrations/**`，不要直接重置数据库，除非用户明确允许。
- Next.js 框架行为不确定：先看 `node_modules/next/dist/docs/` 对应文档。

## 云端与部署

常见云端目标：

- 主机：`111.231.144.61`
- 项目路径：`/www/wwwroot/wenyuo/web`
- 健康检查：`http://111.231.144.61:3000/api/health`

部署原则：

- 同步前先确认本地改动和远端路径，不要覆盖 `.env`、数据库文件和用户上传内容。
- 用户明确说“数据库可以抛弃”时，才允许远端重建或丢弃数据库。
- 用户明确说“为我关闭，我会在宝塔启动”时，只停止你启动的进程，不要额外创建守护进程。
- 最终回复不要复述密码、token、密钥。

## 验证梯度

- 文档或 AGENTS-only：检查 diff 即可，不需要 build。
- 普通 TS/TSX 改动：`npm run lint`。
- 路由、Next、Prisma、依赖、构建相关：`npm run build`。
- Prisma 类型变化：`npx prisma generate`，必要时 `npx prisma migrate status`。
- 可见 UI：启动或复用 `npm run dev -- --port 3000`，打开实际页面检查桌面和移动宽度。
- 写作页重点检查：正文区域高度、右侧工具栏高度、输入框可编辑感、复制提示、滚动同步和顶部栏遮挡。

## PowerShell 注意事项

- bracket 路由路径使用 `-LiteralPath`，例如 `src/app/dashboard/work/[id]`。
- 优先 `rg` 搜索；没有时再用 PowerShell 原生命令。
- 不要用 `git reset --hard`、`git checkout --`、`git clean` 回滚用户改动。
- 手动编辑使用 `apply_patch`，不要用 shell 重写业务文件。

## 忽略目录

除非任务专门要求，不要花时间读取：

- `.next/`
- `node_modules/`
- `output/`
- `.playwright-cli/`
- `*.log`
- `tsconfig.tsbuildinfo`
