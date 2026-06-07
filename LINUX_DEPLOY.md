# Linux / BaoTa deploy

This package is for the `web` Next.js app. It does not include `.env`,
`.env.local`, `node_modules`, build output, logs, or local cache files.

## 0. One-click install

For a fresh Linux server, you can use the installer first:

```bash
curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh | sudo bash
```

For BaoTa or a fixed site path:

```bash
curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh \
  | sudo env APP_DIR=/www/wwwroot/wenyuo/web APP_BASE_URL=https://your-domain.com ROOT_ADMIN_EMAILS=admin@example.com bash
```

See `docs/one-click-install.md` for external database, update, uninstall, and troubleshooting commands.

## 1. Upload and unzip

Upload the zip to your server, for example:

```bash
/www/wwwroot/wenyuo.cn
```

After unzip, enter the app directory:

```bash
cd /www/wwwroot/wenyuo.cn/web
```

## 2. Create `.env`

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and set at least:

```env
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/DB_NAME?schema=public"
SESSION_SECRET="replace-with-a-long-random-string"
AI_BASE_URL="your-openai-compatible-base-url"
AI_API_KEY="your-ai-key"
AI_MODEL="your-model"
```

Generate a session secret if needed:

```bash
openssl rand -base64 48
```

## 3. Install and build

Use Node.js 20 or 22.

```bash
npm ci
npm run db:generate
npm run db:push
npm run build
```

## 4. Start with PM2

```bash
pm2 start npm --name wenyuo -- start
pm2 save
pm2 startup
```

The app listens on port `3000` by default.

## 5. BaoTa reverse proxy

In BaoTa:

```text
Website -> wenyuo.cn -> Settings -> Reverse proxy
```

Proxy target:

```text
http://127.0.0.1:3000
```

Then bind SSL for the domain.
