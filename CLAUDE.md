# Claude Code 项目规范

本文件给 Claude Code 读取。本项目的 AI 规范以 `AGENTS.md` 和 `CLAUDE.md` 为准。Claude Code 在修改代码前必须先阅读本文件；如果任务涉及 TypeScript，还必须阅读 `docs/ai/typescript-guide.md`、`docs/ai/project-structure.md` 和 `docs/ai/change-checklist.md`。

默认中文回复，先给结论，再给执行路径。用户通常要的是实际落地：改代码、修 UI、同步远端、验证页面，而不是只给建议。

## 项目边界

- 当前目录 `web/` 是真实 Next.js 应用和 Git 仓库。
- 所有 Web 命令默认从本目录执行。
- 根目录只做项目总控说明，不承载业务实现。
- 文档任务只改文档；业务任务只改最小必要业务范围。

## 核心禁止规则

- 禁止使用 `any`。
- 禁止使用 `as any`。
- 禁止使用 `as unknown as Xxx`。
- 禁止使用 `// @ts-ignore`。
- 禁止使用 `// @ts-expect-error`，除非已有测试场景确实需要，并且必须说明原因。
- 禁止乱建目录。
- 禁止创建 `utils2`、`common2`、`temp`、`ai-generated`、`new-service` 这类垃圾目录。
- 禁止大规模重构，除非用户明确要求。
- 禁止编造测试结果。
- 禁止说已经运行测试，除非真的运行过。
- 禁止未经要求引入依赖。
- 禁止凭空发明不存在的函数、类型、工具类、目录、配置字段或 API。
- 禁止修改公开 API、路由路径、配置字段、数据库字段、数据结构含义，除非用户明确要求。
- 禁止为了通过编译而降低类型安全。
- 禁止删除用户已有逻辑或覆盖用户未提交改动。
- 禁止用 `git reset --hard`、`git checkout --`、`git clean` 回滚用户改动，除非用户明确要求。

## TypeScript 必须遵守

- 函数参数和返回值必须尽量明确。
- 外部输入必须先校验再使用。
- 复杂对象必须定义 `interface` 或 `type`。
- 不懂类型时必须先查已有类型、同目录代码和共享类型。
- 不能用类型断言欺骗编译器。
- 不能把 `unknown` 直接当业务对象使用，必须缩小类型或通过 schema 校验。

## 命名规则

- 变量、函数使用 `camelCase`。
- 类型、接口、类、React 组件使用 `PascalCase`。
- 常量使用 `UPPER_SNAKE_CASE`。
- 文件名优先使用 `kebab-case`。
- React 组件文件如果项目已有不同规范，必须以项目现有规范为准。

## 文件组织规则

- 新增文件前必须先查找是否已有同类模块。
- 优先放入已有目录，靠近相关业务模块。
- 不允许为了方便绕过现有架构。
- 不允许把所有工具函数都塞进一个巨大 `utils` 文件。
- `src/app/` 只作为 Next.js 路由入口，`page.tsx` 和 `route.ts` 必须保持薄层。
- `src/frontend/` 放浏览器端 feature、API client、前端 hooks 和纯 UI 组合。
- `src/backend/` 放 Prisma、鉴权、AI、统计、邮件、service、repository 和上游 provider。
- `src/shared/` 放 DTO、zod schema、共享类型和共享常量。
- 前端代码禁止直接 import `src/backend/*`。
- 后端代码禁止 import React 组件或浏览器 UI 模块。

## Claude Code 工作流程

1. 先读用户需求。
2. 先读相关文件。
3. 再分析已有实现和同类代码风格。
4. 再制定最小改动方案。
5. 再执行最小改动。
6. 再运行可用检查命令。
7. 最后汇报修改文件、原因、验证结果和风险。

执行时必须：

- 开工前先确认当前目录和真实 Git 状态。
- 优先用 `rg` 搜索相关文件。
- 不要盲扫 `.next`、`node_modules`、构建产物和日志。
- 只动和任务直接相关的文件。
- 没运行检查命令就必须说清楚没运行。

## 项目专属边界

- `src/app/` 只作为 Next.js 路由入口。
- `src/frontend/` 放浏览器端 feature、API client、前端 hooks 和纯 UI 组合。
- `src/backend/` 放 Prisma、鉴权、AI、统计、邮件、service、repository 和上游 provider。
- `src/shared/` 放 DTO、zod schema、共享类型和共享常量。
- UI 放在 `src/components/<domain>/`，如 `dashboard`、`workbench`、`create`、`admin`、`auth`。
- HTTP API 路径默认不改；迁移时优先保留旧路径兼容导出。
- 普通业务 TS/TSX 文件尽量控制在 300-400 行；`route.ts` 尽量控制在 80-150 行。

## 最终回复必须包含

- 改了哪些文件。
- 为什么这样改。
- 是否影响旧功能。
- 是否运行了检查命令。
- 如果没运行检查命令，说明原因。
- 还有什么风险。
