# Admin Rebuild Legacy Retention

后台管理入口已收敛为两个页面：

- `/dashboard/admin`：生成日志。
- `/dashboard/admin/users`：用户管理。

旧后台页面入口不再作为可用功能暴露。以下页面当前保留为重定向到 `/dashboard/admin`：

- `/dashboard/admin/ai-model`
- `/dashboard/admin/payments`
- `/dashboard/admin/prompts`
- `/dashboard/admin/jobs`
- `/dashboard/admin/entry-config`
- `/dashboard/admin/logs`
- `/dashboard/admin/monitor`
- `/dashboard/admin/rules`
- `/dashboard/admin/templates`

## 暂时保留的旧 API

以下旧 API 暂时不删除，原因是仍有测试、运维能力、历史配置读写或非导航入口依赖。它们不得重新挂回后台导航：

- `/api/admin/ai-model-config`
- `/api/admin/ai-stats`
- `/api/admin/ai/auxiliary-cost`
- `/api/admin/audit-logs`
- `/api/admin/create-config`
- `/api/admin/jobs`
- `/api/admin/jobs/run-pending`
- `/api/admin/payments/alipay`
- `/api/admin/planning-config`
- `/api/admin/prompts`
- `/api/admin/prompts/[id]`
- `/api/admin/system/version`
- `/api/admin/system/update`
- `/api/admin/system/update/[jobId]`
- `/api/admin/templates`
- `/api/admin/templates/[id]`
- `/api/admin/templates/learn`
- `/api/admin/users/[id]/reset-password`

## 暂时保留的旧组件和 hook

以下旧后台组件和 hook 暂时保留，但新后台首页和新用户管理页不得依赖它们：

- `src/components/admin/dashboard-admin-view.tsx`
- `src/components/admin/admin-audit-section.tsx`
- `src/components/admin/admin-config-*.tsx`
- `src/components/admin/admin-jobs-view.tsx`
- `src/components/admin/admin-payment-settings.tsx`
- `src/components/admin/admin-planning-section.tsx`
- `src/components/admin/admin-prompts-view.tsx`
- `src/components/admin/admin-stats-section.tsx`
- `src/components/admin/admin-template-section.tsx`
- `src/components/admin/admin-users-*.tsx`
- `src/components/admin/ai-model-*.tsx`
- `src/lib/admin/use-dashboard-admin.ts`
- `src/lib/admin/use-admin-create-config-actions.ts`
- `src/lib/admin/use-admin-entry-config.ts`
- `src/lib/admin/use-admin-jobs.ts`
- `src/lib/admin/use-admin-logs.ts`
- `src/lib/admin/use-admin-monitor.ts`
- `src/lib/admin/use-admin-prompts.ts`
- `src/lib/admin/use-admin-rules.ts`
- `src/lib/admin/use-admin-templates*.ts`
- `src/lib/admin/use-admin-users.ts`
- `src/lib/admin/use-ai-model-config.ts`
- `src/lib/admin/use-alipay-payment-settings.ts`

## 后续删除条件

第二阶段清理这些遗留文件前，必须先同时满足：

- 全量测试不再读取或断言旧后台文件。
- 线上运维不再依赖旧 API。
- 支付、提示词模板、部署更新等能力已有新的归属或明确废弃决定。
- 删除后 `npm run typecheck`、`npm run lint`、`npm run test`、`npm run build` 全部通过。
