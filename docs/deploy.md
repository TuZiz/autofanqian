# 部署与后台云端更新

## 服务器准备

1. 安装 Node.js、npm、git、PM2。
2. 将项目 clone 到服务器目录，例如：`/www/wwwroot/autofanqian`。
3. 在服务器项目目录创建 `.env`，填写数据库、登录、AI、支付宝等真实配置。
4. 首次安装与构建：

```bash
cd /www/wwwroot/autofanqian
npm ci
npm run db:generate
npm run build
pm2 start npm --name autofanqian -- start
pm2 save
```

5. 宝塔 / Nginx 反向代理到 `127.0.0.1:3000`。

## 自动部署脚本

项目内置 `scripts/deploy.sh`，默认参数：

- `APP_DIR=/www/wwwroot/autofanqian`
- `BRANCH=main`
- `APP_NAME=autofanqian`

如服务器实际路径不同，可在执行前设置环境变量：

```bash
APP_DIR=/www/wwwroot/wenyuo/web APP_NAME=autofanqian bash scripts/deploy.sh
```

脚本会固定执行：拉取 `origin/main`、安装依赖、生成 Prisma Client、`npx prisma migrate deploy`、构建 Next.js、PM2 reload。脚本使用锁文件防止并发部署。

## GitHub Secrets

如果接入 GitHub Actions 自动部署，请在仓库 Settings → Secrets and variables → Actions 中配置：

- `DEPLOY_HOST`：服务器 IP 或域名
- `DEPLOY_USER`：SSH 用户
- `DEPLOY_PORT`：SSH 端口，例如 `22`
- `DEPLOY_PATH`：服务器项目目录
- `DEPLOY_SSH_KEY`：部署用户私钥

不要把 `.env`、数据库密码、支付宝私钥、AI key、`SETTINGS_ENCRYPTION_KEY` 写入 GitHub。

## 后台版本更新中心

root admin / super_admin 可以在管理员后台点击版本号，查看当前版本、检查 GitHub 最新版本，并触发“云端更新”。后台更新只会执行服务器上的固定脚本 `scripts/deploy.sh`，前端不能传入 shell 命令。
