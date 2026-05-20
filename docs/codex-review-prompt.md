# autofanqian 生产级优化 Codex 提示词

你现在接手 GitHub 仓库 `TuZiz/autofanqian`，这是一个基于 Next.js / TypeScript / Prisma / PostgreSQL 的 AI 小说写作 SaaS 项目。

目标：不要重写整个项目，在保持现有架构、UI、数据库兼容性的前提下，完成一轮“生产级稳定性与性能优化”。

请先完整阅读：

- `README.md`
- `package.json`
- `prisma/schema.prisma`
- `src/lib/auth/session.ts`
- `src/lib/auth/login-security.ts`
- `src/lib/ai/chapter-generation-lock.ts`
- `src/lib/ai/quota.ts`
- `src/backend/ai/upstream/**`
- `src/app/api/**/route.ts`

然后按下面优先级修改。

---

## 一、P0：把章节 AI 生成锁从内存 Map 升级为持久化任务系统

当前 `src/lib/ai/chapter-generation-lock.ts` 使用进程内 Map 作为生成锁，这在单进程可以工作，但在 PM2 cluster、Docker 多副本、Serverless、进程重启时会失效。

请设计并实现数据库级 `GenerationJob` 任务系统。

要求：

1. 在 Prisma schema 中新增 `GenerationJob` 表。
2. 字段至少包含：
   - `id`
   - `userId`
   - `workId`
   - `chapterId`，可为空
   - `action` / `jobType`
   - `status`: `queued` / `running` / `succeeded` / `failed` / `cancelled`
   - `idempotencyKey`
   - `providerId`
   - `modelUsed`
   - `routeId`
   - `errorMessage`
   - `startedAt`
   - `finishedAt`
   - `heartbeatAt`
   - `createdAt`
   - `updatedAt`
3. 同一个 `userId + workId + chapterId + action` 在 `running/queued` 状态下不能重复创建。
4. 支持幂等：
   - 相同 `idempotencyKey` 重复请求不能重复扣额度、不能重复生成。
5. 支持崩溃恢复：
   - 如果 `running` 任务 `heartbeatAt` 超时，允许标记为 `failed/stale`。
6. 替换原来的内存锁调用点。
7. 保留原文件导出兼容层，避免大范围破坏 import。
8. 不允许因为任务系统导致重复生成、重复扣额度、重复写章节。

验收标准：

- 多个并发请求生成同一章节，只能有一个任务真正执行。
- 进程重启后，不会误以为没有任务。
- 失败任务可以正确落库。
- 取消任务能正确更新状态。

---

## 二、P0：优化 session lastSeenAt 写入频率

当前 `getCurrentSession()` 每次读取有效 session 都可能更新 `lastSeenAt`，这会造成数据库写放大。

请修改：

1. 只有当距离上次 `lastSeenAt` 超过 5~15 分钟时才更新。
2. 阈值放到常量中，例如 `SESSION_TOUCH_INTERVAL_MS`。
3. 保持现有 Cookie 行为不变。
4. 不破坏登录、退出、管理员鉴权逻辑。

验收标准：

- 高频 API 请求不会每次写 `UserSession`。
- session 过期和 revoke 行为保持正确。
- 现有 auth 相关测试通过；如果没有测试，请补最小测试。

---

## 三、P0：AI 额度系统增加聚合计数器

当前额度统计依赖事件和 reservation 聚合，后期用户量上来会变重。

请新增 `AiUsageCounter` 表，用于快速判断 daily/monthly/minute 额度。

字段建议：

- `id`
- `userId`
- `periodType`: `minute` / `daily` / `monthly`
- `periodKey`，例如 `2026-05-20`、`2026-05`、`2026-05-20T12:30`
- `action`
- `requestCount`
- `charCount`
- `tokenCount`
- `createdAt`
- `updatedAt`

要求：

1. 保留 `AiUsageEvent` 作为审计日志。
2. 扣额度流程必须事务化。
3. 生成成功后写事件并更新 counter。
4. 失败、取消、上游错误时不能错误扣费。
5. reservation 过期需要能释放或标记。
6. 不要引入数据不一致风险。
7. 给出迁移文件。

验收标准：

- Free / Plus / Pro / Max 后续能基于 counter 快速判断额度。
- 并发请求不会绕过额度限制。
- 失败任务不会永久占用额度。
- 测试覆盖并发扣额度、失败回滚、重复请求幂等。

---

## 四、P1：增强登录风控与清理机制

当前已有登录失败记录和 IP/email 统计，请优化：

1. 增加统一 rate limit helper。
2. 支持按 IP、email、userId 三个维度限流。
3. 如果项目没有 Redis，不强制引入 Redis；可以先用数据库实现，但接口要预留 Redis/KV 适配。
4. 定期清理过期 `LoginAttempt`、`EmailVerificationCode`、`AiQuotaReservation`。
5. 敏感日志脱敏，不要输出完整邮箱、IP、token、session。

验收标准：

- 暴力登录不会造成大量无意义 DB 压力。
- 清理逻辑不会误删有效数据。
- 登录失败提示不要泄露用户是否存在。

---

## 五、P1：AI 上游调用增加生产级观测与熔断

检查 `src/backend/ai/upstream/**`。

请增加：

1. `requestId` 全链路传递。
2. `providerId`、`routeId`、`endpoint`、`modelUsed`、`durationMs`、`status` 结构化日志。
3. 上游 timeout 统一处理。
4. `AbortSignal` 必须从 API route 传到底层 fetch/stream。
5. 连续失败的 provider 要短暂降权或熔断。
6. 不要把完整 prompt、用户正文、API key 输出到日志。
7. 增加上游错误归一化，方便前端显示。

验收标准：

- 上游超时不会卡死请求。
- 用户取消请求时，后端能尽快中断。
- provider 失败可以 fallback。
- 日志可以定位是哪一个 provider/model/route 出问题。

---

## 六、P1：API route 瘦身和权限统一

检查 `src/app/api/**/route.ts`。

要求：

1. API route 只做：
   - 鉴权
   - 参数校验
   - 调用 backend service
   - 返回统一响应
2. 新增或整理统一 helper：
   - `requireUser()`
   - `requireAdmin()`
   - `requireWorkOwner()`
   - `createApiSuccess()`
   - `createApiError()`
3. 所有作品、章节、设置相关接口必须校验资源归属。
4. 禁止用户访问、修改、删除不属于自己的作品和章节。

验收标准：

- 越权访问返回 403 或 404。
- route 文件明显变薄。
- 业务逻辑沉到 backend service 层。

---

## 七、P1：安全响应头与 CSRF

项目使用 Cookie 登录态，请增加基础安全防护。

要求：

1. 增加 CSRF 防护，至少覆盖 POST / PATCH / PUT / DELETE。
2. 增加安全响应头：
   - `Content-Security-Policy`
   - `X-Frame-Options` 或 `frame-ancestors`
   - `Referrer-Policy`
   - `X-Content-Type-Options`
3. 不破坏 Next.js 静态资源和现有页面。
4. 开发环境可以适当放宽，生产环境严格。

验收标准：

- 普通页面正常加载。
- API 写操作没有 CSRF token 时拒绝。
- 登录、退出、AI 生成流程正常。

---

## 八、测试与 CI

请补充测试和 GitHub Actions。

测试至少覆盖：

1. auth：
   - 登录成功
   - 登录失败
   - session 过期
   - session revoke
2. quota：
   - 正常扣额度
   - 并发扣额度
   - 失败释放 reservation
   - 幂等请求不重复扣
3. generation job：
   - 同章节并发只能创建一个 running job
   - stale job 可恢复
   - failed job 正确记录错误
4. ownership：
   - 用户不能访问别人的 work/chapter

CI 要执行：

```bash
npm ci
npx prisma generate
npm run typecheck
npm run lint
npm run test
npm run build
```

如果现有脚本名称不同，请以 `package.json` 为准调整。

---

## 九、代码风格要求

1. TypeScript 严格类型，不要使用 `any` 糊弄。
2. 不要大规模重构 UI。
3. 不要删除现有功能。
4. 不要把业务逻辑塞进 API route。
5. 所有新增环境变量要写入 `.env.example`。
6. 所有新增表必须有 Prisma migration。
7. 所有错误返回要保持前端可读。
8. 所有日志必须脱敏。
9. 保持现有 import 路径尽量兼容。
10. 修改完成后，输出完整变更总结、风险点、测试结果。

---

## 最终交付

请完成代码修改，并在最终回复中给出：

1. 修改了哪些文件。
2. 新增了哪些数据库表。
3. 新增了哪些环境变量。
4. 如何运行迁移。
5. 如何运行测试。
6. 哪些地方仍然需要后续优化。
