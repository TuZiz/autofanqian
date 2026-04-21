# BayData Web

基于 `Next.js App Router + TypeScript + Tailwind CSS v4 + shadcn/ui + Prisma + PostgreSQL` 的后台项目。

## 当前能力

- 邮箱 + 密码登录
- 邮箱验证码注册
- 邮箱验证码找回密码
- HttpOnly Cookie 会话
- `/dashboard` 登录保护

## 认证接口

- 前端对接文档：`docs/auth-frontend-handoff.md`
- 认证接口目录：`src/app/api/auth/*`
- 受保护页面：`/dashboard`

## 环境准备

1. 安装 `Node.js`
2. 安装并启动 `PostgreSQL`
3. 准备 `.env`

如果项目根目录不存在 `.env`，启动脚本会尝试从 `.env.example` 自动生成一份。

## 一键启动

Windows 下直接运行：

```powershell
.\start-dev.cmd
```

脚本会自动完成这些步骤：

- 检查 `node` 和 `npm`
- 在缺少 `node_modules` 时自动执行 `npm install`
- 检查 `.env` 与 `DATABASE_URL`
- 检查 PostgreSQL 端口是否可连接
- 自动确保目标数据库存在
- 执行 `prisma migrate deploy`
- 启动开发服务器

启动成功后访问：

- [http://localhost:3000](http://localhost:3000)

## 手动启动

```powershell
npm install
npx prisma migrate deploy
npm run dev
```

## 健康检查

- [http://localhost:3000/api/health](http://localhost:3000/api/health)

## 常用页面

- `/login`
- `/register`
- `/forgot-password`
- `/dashboard`
