# 项目结构规范

本文件用于防止 AI 乱建目录、乱放文件、重复造轮子。新增文件前必须先理解项目结构。

## 1. 先理解真实项目

- 当前目录 `web/` 是真实 Next.js 应用和 Git 仓库。
- 根目录只做项目总控说明，不承载业务实现。
- 所有 Web 命令默认从 `web/` 执行。
- 不要把业务代码写到根目录。

## 2. 新增文件前必须先查找

新增文件前必须做：

1. 搜索同名或同类功能。
2. 阅读相关目录的已有文件。
3. 找到同类代码放在哪里。
4. 按现有目录职责放置新文件。
5. 如果不确定位置，最终回复必须说明不确定点，不要乱放。

## 3. 禁止乱建目录

禁止创建这些目录：

- `utils2`
- `common2`
- `temp`
- `ai-generated`
- `new-service`
- `new-components`
- `misc`
- `backup-new`

禁止为了方便绕过现有架构。禁止把新代码放到一个看起来“随便能用”的目录里。

## 4. 不要重复造轮子

- 新功能必须先找已有 service、repository、hook、schema、DTO、UI 组件。
- 已有工具能复用时必须复用。
- 已有模式能扩展时必须扩展。
- 禁止复制一份相似逻辑后改几个名字。
- 禁止把所有工具函数都丢进一个巨大 `utils` 文件。

## 5. Web 目录放置规则

`src/app/`：

- 只放 Next.js 路由入口。
- `page.tsx` 和 `route.ts` 必须保持薄层。
- 页面复杂逻辑必须下沉到组件、hook、service 或 shared schema。

`src/frontend/`：

- 放浏览器端 feature。
- 放 API client。
- 放前端 hooks。
- 放纯 UI 组合逻辑。

`src/backend/`：

- 放 Prisma 访问。
- 放鉴权、AI、统计、邮件。
- 放 service、repository 和上游 provider。
- 禁止被浏览器端组件直接 import。

`src/shared/`：

- 放 DTO。
- 放 zod schema。
- 放共享类型。
- 放共享常量。

`src/components/`：

- 放 React UI 组件。
- 新组件必须靠近业务域，例如 `dashboard`、`workbench`、`create`、`admin`、`auth`。
- 禁止把具体业务组件塞进通用 UI 目录。

## 6. 新功能靠近相关模块

正确：

- Dashboard 作品筛选组件放在 dashboard 相关目录。
- 写作页章节编辑逻辑放在 workbench 相关目录。
- 管理员配置抽屉放在 admin 相关目录。
- 共享 DTO 放在 shared 相关目录。

错误：

- 为一个 dashboard 小功能创建 `src/new-service/`。
- 为一个页面创建 `src/utils2/`。
- 把 workbench 专用函数放进全局 `utils`。
- 绕过已有 API client 直接在组件里复制请求逻辑。

## 7. 不确定时怎么办

如果仍不确定文件应该放哪里：

1. 继续搜索类似功能。
2. 阅读 `AGENTS.md` 的高频入口。
3. 选择最接近业务域的已有目录。
4. 在最终回复中说明放置理由和不确定点。

禁止因为不确定就创建临时目录。
