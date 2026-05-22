# GenerationJob Worker 部署说明

`npm run worker:generation` 是独立的 GenerationJob 后台执行器，用于持续扫描并执行 queued / stale 任务，例如长文本短篇分段生成、全书一致性检查、批量章节生成和故事圣经提取。

## 环境变量

```bash
GENERATION_WORKER_INTERVAL_MS=15000
GENERATION_WORKER_BATCH_SIZE=5
```

- `GENERATION_WORKER_INTERVAL_MS`：扫描间隔，建议 10000-30000 毫秒。
- `GENERATION_WORKER_BATCH_SIZE`：单轮处理数量，范围 1-20。

Worker 会捕获单轮错误并继续下一轮，也会响应 `SIGINT` / `SIGTERM` 优雅退出。

## PM2

```bash
cd /www/wwwroot/wenyuo/web
npm install
npm run build
pm2 start npm --name autofanqian-web -- run start
pm2 start npm --name autofanqian-generation-worker -- run worker:generation
pm2 save
pm2 status
```

更新部署后：

```bash
pm2 reload autofanqian-web
pm2 restart autofanqian-generation-worker
```

## systemd

示例 `/etc/systemd/system/autofanqian-generation-worker.service`：

```ini
[Unit]
Description=Autofanqian GenerationJob Worker
After=network.target

[Service]
Type=simple
WorkingDirectory=/www/wwwroot/wenyuo/web
Environment=NODE_ENV=production
Environment=GENERATION_WORKER_INTERVAL_MS=15000
Environment=GENERATION_WORKER_BATCH_SIZE=5
ExecStart=/usr/bin/npm run worker:generation
Restart=always
RestartSec=5
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target
```

启用：

```bash
systemctl daemon-reload
systemctl enable --now autofanqian-generation-worker
systemctl status autofanqian-generation-worker
```

## Docker Compose

```yaml
services:
  web:
    image: autofanqian-web:latest
    command: npm run start
    env_file:
      - .env
    ports:
      - "3000:3000"
    depends_on:
      - postgres

  worker:
    image: autofanqian-web:latest
    command: npm run worker:generation
    env_file:
      - .env
    environment:
      GENERATION_WORKER_INTERVAL_MS: "15000"
      GENERATION_WORKER_BATCH_SIZE: "5"
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: autofanqian
      POSTGRES_USER: autofanqian
      POSTGRES_PASSWORD: change-me
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

## Windows / 宝塔

- 在宝塔中为 Web 站点保留正常的 Next.js 启动命令。
- 额外新增一个 Node 进程守护或计划任务，工作目录指向 `web/`。
- 命令使用：

```powershell
npm run worker:generation
```

- 建议开启失败自动重启，并把日志输出到独立文件，便于排查 AI provider、额度或数据库连接问题。

## 验收

- 打开 `/dashboard/admin/jobs`，确认 queued / stale 任务会被自动消费。
- Worker 日志应包含 `tick completed`，并展示 scanned / succeeded / failed / skipped / durationMs。
- 连续失败达到阈值的任务会停止自动重试，需要用户或管理员手动重试。
