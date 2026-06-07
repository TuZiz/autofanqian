# 一键安装脚本

本项目提供类似 `sub2api` 的 Linux 一键安装入口，用于首次把 Web 应用部署到服务器，并用 PM2 常驻运行 Web 服务和 GenerationJob Worker。

## 前置条件

- Linux 服务器。
- 已安装 `git`、`node`、`npm`，Node.js 版本需要 `20+`。
- 如需让脚本自动启动本地 PostgreSQL，请提前安装 Docker 和 Docker Compose。
- 如使用已有 PostgreSQL，请提前准备可连接的 `DATABASE_URL`。

## 最短安装命令

```bash
curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh | sudo bash
```

默认值：

- 项目目录：`/www/wwwroot/autofanqian`
- 服务名：`autofanqian`
- Web 端口：`3000`
- Worker 服务名：`autofanqian-worker`
- 数据库：优先使用项目自带 `docker-compose.yml` 启动 PostgreSQL；没有 Docker 时使用 `.env` 中的 `DATABASE_URL`

## 推荐安装命令

生产环境建议显式传入访问地址和管理员邮箱：

```bash
curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh \
  | sudo env APP_BASE_URL=https://你的域名 ROOT_ADMIN_EMAILS=admin@example.com bash
```

宝塔或固定目录部署时：

```bash
curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh \
  | sudo env APP_DIR=/www/wwwroot/wenyuo/web APP_BASE_URL=https://你的域名 ROOT_ADMIN_EMAILS=admin@example.com bash
```

使用已有 PostgreSQL 时：

```bash
curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh \
  | sudo env USE_DOCKER_DB=false DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:5432/DB_NAME?schema=public' APP_BASE_URL=https://你的域名 ROOT_ADMIN_EMAILS=admin@example.com bash
```

## 脚本会做什么

1. 检查 Linux、Git、Node.js、npm 和 PM2。
2. 克隆或更新 `https://github.com/TuZiz/autofanqian.git`。
3. 从 `.env.example` 创建或检查 `.env`，自动补全缺失项和明显占位值，并生成 `SESSION_SECRET`、`SETTINGS_ENCRYPTION_KEY`、数据库密码等随机值。
4. 可选启动 `docker-compose.yml` 中的 PostgreSQL。
5. 执行 `npm ci --include=dev`、`npx prisma migrate deploy`、`npm run build`。
6. 用 PM2 启动 `autofanqian` 和 `autofanqian-worker`，并配置开机自启。

## 更新、诊断、卸载

```bash
# 更新代码、迁移、构建并重启 PM2
curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh | sudo bash -s -- update

# 查看 PM2 状态
curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh | sudo bash -s -- doctor

# 停止并移除 PM2 进程
curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh | sudo bash -s -- uninstall -y

# 连项目目录和系统用户一起删除
curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh | sudo bash -s -- uninstall --purge -y
```

## 常用命令

```bash
sudo -u autofanqian pm2 status
sudo -u autofanqian pm2 logs autofanqian
sudo -u autofanqian pm2 logs autofanqian-worker
sudo -u autofanqian pm2 restart autofanqian
sudo -u autofanqian pm2 restart autofanqian-worker
```

## 部署后检查

- 在宝塔 / Nginx 中把域名反向代理到 `http://127.0.0.1:3000`。
- 已有 `.env` 会保留真实配置；脚本只会补全空值、缺失值、`replace-with-*` / `your-*` 这类占位值，以及默认的 `localhost` / `admin@example.com`。
- 检查 `.env` 中的 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL`、SMTP 配置和 `ROOT_ADMIN_EMAILS`。
- 如果使用 HTTPS，确保 `APP_BASE_URL` 是 `https://...`，并保持 `SESSION_COOKIE_SECURE=true`。
- 打开 `https://你的域名/api/health` 或 `http://服务器IP:3000/api/health` 检查服务。
