#!/usr/bin/env bash
set -Eeuo pipefail

# Autofanqian one-click Linux installer.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh | sudo bash

APP_NAME="${APP_NAME:-autofanqian}"
APP_DIR="${APP_DIR:-/www/wwwroot/autofanqian}"
REPO_URL="${REPO_URL:-https://github.com/TuZiz/autofanqian.git}"
BRANCH="${BRANCH:-main}"
SERVICE_USER="${SERVICE_USER:-$APP_NAME}"
SERVICE_HOME="${SERVICE_HOME:-/var/lib/$SERVICE_USER}"
PORT="${PORT:-3000}"
WITH_WORKER="${WITH_WORKER:-true}"
USE_DOCKER_DB="${USE_DOCKER_DB:-auto}"
ALLOW_RESET="${ALLOW_RESET:-false}"
NODE_MIN_MAJOR="${NODE_MIN_MAJOR:-20}"

COMMAND="install"
FORCE_YES="false"
PURGE="false"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info() {
  echo -e "${BLUE}[信息]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[完成]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[警告]${NC} $1"
}

print_error() {
  echo -e "${RED}[错误]${NC} $1" >&2
}

usage() {
  cat <<EOF
Autofanqian 一键安装脚本

命令：
  install        安装或补全首次部署（默认）
  update         拉取代码、迁移、构建并重启 PM2
  doctor         查看 PM2 状态和常用命令
  uninstall      停止并移除 PM2 进程，--purge 时同时删除目录和用户

常用环境变量：
  APP_DIR=/www/wwwroot/autofanqian
  APP_NAME=autofanqian
  REPO_URL=https://github.com/TuZiz/autofanqian.git
  BRANCH=main
  PORT=3000
  ROOT_ADMIN_EMAILS=admin@example.com
  APP_BASE_URL=https://example.com
  USE_DOCKER_DB=auto|true|false
  WITH_WORKER=true|false
  ALLOW_RESET=false|true

示例：
  curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh | sudo bash
  curl -fsSL https://raw.githubusercontent.com/TuZiz/autofanqian/main/scripts/install.sh | sudo env APP_DIR=/www/wwwroot/wenyuo/web APP_BASE_URL=https://wenyuo.cn ROOT_ADMIN_EMAILS=admin@wenyuo.cn bash
EOF
}

shell_quote() {
  printf "%q" "$1"
}

is_interactive() {
  [ -e /dev/tty ] && [ -r /dev/tty ] && [ -w /dev/tty ]
}

prompt_value() {
  local prompt="$1"
  local default_value="$2"
  local input=""

  if ! is_interactive; then
    echo "$default_value"
    return
  fi

  read -r -p "$prompt [$default_value]: " input < /dev/tty
  if [ -n "$input" ]; then
    echo "$input"
  else
    echo "$default_value"
  fi
}

confirm_or_exit() {
  local message="$1"

  if [ "$FORCE_YES" = "true" ]; then
    return
  fi

  if ! is_interactive; then
    print_error "$message。非交互模式请追加 -y。"
    exit 1
  fi

  local input=""
  read -r -p "$message，继续吗？[y/N] " input < /dev/tty
  case "$input" in
    y|Y|yes|YES) ;;
    *) print_info "已取消"; exit 0 ;;
  esac
}

parse_args() {
  while [ "$#" -gt 0 ]; do
    case "$1" in
      install|update|doctor|uninstall|remove)
        COMMAND="$1"
        shift
        ;;
      --app-dir)
        APP_DIR="${2:-}"
        shift 2
        ;;
      --app-dir=*)
        APP_DIR="${1#*=}"
        shift
        ;;
      --repo)
        REPO_URL="${2:-}"
        shift 2
        ;;
      --repo=*)
        REPO_URL="${1#*=}"
        shift
        ;;
      --branch)
        BRANCH="${2:-}"
        shift 2
        ;;
      --branch=*)
        BRANCH="${1#*=}"
        shift
        ;;
      --port)
        PORT="${2:-}"
        shift 2
        ;;
      --port=*)
        PORT="${1#*=}"
        shift
        ;;
      --worker)
        WITH_WORKER="true"
        shift
        ;;
      --no-worker)
        WITH_WORKER="false"
        shift
        ;;
      --use-docker-db)
        USE_DOCKER_DB="true"
        shift
        ;;
      --no-docker-db)
        USE_DOCKER_DB="false"
        shift
        ;;
      --allow-reset)
        ALLOW_RESET="true"
        shift
        ;;
      --purge)
        PURGE="true"
        shift
        ;;
      -y|--yes)
        FORCE_YES="true"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        print_error "未知参数：$1"
        usage
        exit 1
        ;;
    esac
  done

  if [ "$COMMAND" = "remove" ]; then
    COMMAND="uninstall"
  fi
}

check_root() {
  if [ "$(id -u)" -ne 0 ]; then
    print_error "请使用 root 权限运行，例如：curl ... | sudo bash"
    exit 1
  fi
}

check_linux() {
  if [ "$(uname -s | tr '[:upper:]' '[:lower:]')" != "linux" ]; then
    print_error "该安装脚本仅支持 Linux 服务器"
    exit 1
  fi
}

ensure_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    print_error "缺少依赖命令：$command_name"
    exit 1
  fi
}

check_runtime() {
  print_info "检查运行环境"
  ensure_command git
  ensure_command node
  ensure_command npm

  local node_major
  node_major="$(node -e 'process.stdout.write(process.versions.node.split(".")[0])')"
  if [ "$node_major" -lt "$NODE_MIN_MAJOR" ]; then
    print_error "Node.js 版本过低：当前 $node_major，需要 >= $NODE_MIN_MAJOR。建议安装 Node.js 20 或 22。"
    exit 1
  fi

  if ! command -v pm2 >/dev/null 2>&1; then
    print_info "安装 PM2"
    npm install -g pm2
  fi

  ensure_command pm2
}

create_service_user() {
  if id "$SERVICE_USER" >/dev/null 2>&1; then
    print_info "系统用户已存在：$SERVICE_USER"
  else
    print_info "创建系统用户：$SERVICE_USER"
    useradd --system --create-home --home-dir "$SERVICE_HOME" --shell /bin/bash "$SERVICE_USER"
  fi

  mkdir -p "$SERVICE_HOME"
  chown -R "$SERVICE_USER:$SERVICE_USER" "$SERVICE_HOME"
}

run_as_app_user() {
  local app_dir_quoted
  app_dir_quoted="$(shell_quote "$APP_DIR")"
  runuser -u "$SERVICE_USER" -- bash -lc "cd $app_dir_quoted && $*"
}

run_as_service_user() {
  runuser -u "$SERVICE_USER" -- bash -lc "$*"
}

sync_repository() {
  print_info "准备项目目录：$APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"

  if [ -d "$APP_DIR/.git" ]; then
    print_info "检测到已有 Git 仓库，拉取 $BRANCH"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"
    run_as_app_user "git fetch origin $(shell_quote "$BRANCH")"

    if [ "$ALLOW_RESET" = "true" ] || [ "$COMMAND" = "update" ]; then
      run_as_app_user "git checkout $(shell_quote "$BRANCH") || git checkout -B $(shell_quote "$BRANCH") origin/$(shell_quote "$BRANCH")"
      run_as_app_user "git reset --hard origin/$(shell_quote "$BRANCH")"
    else
      run_as_app_user "git checkout $(shell_quote "$BRANCH") || true"
      if ! run_as_app_user "git merge --ff-only origin/$(shell_quote "$BRANCH")"; then
        print_error "已有目录存在本地改动或无法快进更新。确认要覆盖时使用 ALLOW_RESET=true。"
        exit 1
      fi
    fi
  elif [ -d "$APP_DIR" ] && [ "$(find "$APP_DIR" -mindepth 1 -maxdepth 1 2>/dev/null | wc -l)" -gt 0 ]; then
    print_error "$APP_DIR 已存在且不是空目录，也不是 Git 仓库。请换一个 APP_DIR。"
    exit 1
  else
    print_info "克隆仓库：$REPO_URL ($BRANCH)"
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
    chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"
  fi
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n'
  else
    node -e 'process.stdout.write(require("node:crypto").randomBytes(48).toString("base64"))'
  fi
}

generate_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24 | tr -d '\n'
  else
    node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))'
  fi
}

set_env_value() {
  local env_file="$1"
  local key="$2"
  local value="$3"

  node - "$env_file" "$key" "$value" <<'NODE'
const fs = require("node:fs");

const [file, key, value] = process.argv.slice(2);
const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const nextLine = `${key}=${JSON.stringify(value)}`;
let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const matcher = new RegExp(`^\\s*${escapedKey}\\s*=.*$`, "m");

if (matcher.test(text)) {
  text = text.replace(matcher, nextLine);
} else {
  text += `${text.endsWith("\n") || text.length === 0 ? "" : "\n"}${nextLine}\n`;
}

fs.writeFileSync(file, text);
NODE
}

read_env_value() {
  local env_file="$1"
  local key="$2"

  node - "$env_file" "$key" <<'NODE'
const fs = require("node:fs");

const [file, key] = process.argv.slice(2);
if (!fs.existsSync(file)) process.exit(0);

const text = fs.readFileSync(file, "utf8");
const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const matcher = text.match(new RegExp(`^\\s*${escapedKey}\\s*=\\s*(.*)$`, "m"));
if (!matcher) process.exit(0);

let value = matcher[1].trim();
if (
  (value.startsWith('"') && value.endsWith('"')) ||
  (value.startsWith("'") && value.endsWith("'"))
) {
  value = value.slice(1, -1);
}

process.stdout.write(value);
NODE
}

is_env_defaultish() {
  local key="$1"
  local value="$2"
  local lower_value

  if [ -z "$value" ]; then
    return 0
  fi

  lower_value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"
  case "$lower_value" in
    replace-with-*|your-*)
      return 0
      ;;
  esac

  case "$key:$value" in
    DATABASE_URL:*replace-with-a-strong-password*)
      return 0
      ;;
    APP_BASE_URL:http://localhost:3000|APP_BASE_URL:http://127.0.0.1:3000|APP_BASE_URL:https://example.com)
      return 0
      ;;
    TRUSTED_ORIGINS:http://localhost:3000|TRUSTED_ORIGINS:http://127.0.0.1:3000|TRUSTED_ORIGINS:https://example.com)
      return 0
      ;;
    ROOT_ADMIN_EMAILS:admin@example.com|ADMIN_EMAILS:admin@example.com|ADMIN_EMAIL:admin@example.com)
      return 0
      ;;
  esac

  return 1
}

resolve_env_value() {
  local env_file="$1"
  local key="$2"
  local default_value="$3"
  local current_value
  local provided_value

  current_value="$(read_env_value "$env_file" "$key")"
  provided_value="$(printenv "$key" 2>/dev/null || true)"

  if [ -n "$provided_value" ]; then
    echo "$provided_value"
  elif is_env_defaultish "$key" "$current_value"; then
    echo "$default_value"
  else
    echo "$current_value"
  fi
}

fill_env_value() {
  local env_file="$1"
  local key="$2"
  local value="$3"
  local current_value
  local provided_value

  current_value="$(read_env_value "$env_file" "$key")"
  provided_value="$(printenv "$key" 2>/dev/null || true)"

  if [ -n "$provided_value" ] || is_env_defaultish "$key" "$current_value"; then
    if [ "$current_value" != "$value" ]; then
      set_env_value "$env_file" "$key" "$value"
      print_info "补全环境变量：$key"
    fi
  fi
}

get_public_ip() {
  local ip=""
  ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  if [ -n "$ip" ]; then
    echo "$ip"
  else
    echo "YOUR_SERVER_IP"
  fi
}

prepare_env_file() {
  local env_file="$APP_DIR/.env"
  local env_example="$APP_DIR/.env.example"
  local env_created="false"

  if [ ! -f "$env_file" ]; then
    if [ ! -f "$env_example" ]; then
      print_error "缺少 .env.example，无法创建 .env"
      exit 1
    fi

    print_info "创建 .env"
    cp "$env_example" "$env_file"
    env_created="true"
  else
    print_info "保留已有 .env"
  fi

  local postgres_db
  local postgres_user
  local postgres_password
  local generated_database_url
  local database_url
  local current_app_base_url
  local default_base_url
  local app_base_url
  local root_admin_emails
  local trusted_origins
  local session_cookie_secure
  local session_secret
  local settings_encryption_key

  postgres_db="$(resolve_env_value "$env_file" "POSTGRES_DB" "autofanqian")"
  postgres_user="$(resolve_env_value "$env_file" "POSTGRES_USER" "autofanqian")"
  postgres_password="$(resolve_env_value "$env_file" "POSTGRES_PASSWORD" "$(generate_password)")"
  generated_database_url="postgresql://${postgres_user}:${postgres_password}@127.0.0.1:5432/${postgres_db}?schema=public"
  database_url="$(resolve_env_value "$env_file" "DATABASE_URL" "$generated_database_url")"

  current_app_base_url="$(read_env_value "$env_file" "APP_BASE_URL")"
  default_base_url="http://$(get_public_ip):$PORT"
  if [ -n "${APP_BASE_URL-}" ]; then
    app_base_url="$APP_BASE_URL"
  elif is_env_defaultish "APP_BASE_URL" "$current_app_base_url"; then
    app_base_url="$(prompt_value "应用访问地址" "$default_base_url")"
  else
    app_base_url="$current_app_base_url"
  fi

  if [ -n "${ROOT_ADMIN_EMAILS-}" ]; then
    root_admin_emails="$ROOT_ADMIN_EMAILS"
  elif is_env_defaultish "ROOT_ADMIN_EMAILS" "$(read_env_value "$env_file" "ROOT_ADMIN_EMAILS")"; then
    root_admin_emails="$(read_env_value "$env_file" "ADMIN_EMAILS")"
    if is_env_defaultish "ADMIN_EMAILS" "$root_admin_emails"; then
      root_admin_emails="$(read_env_value "$env_file" "ADMIN_EMAIL")"
    fi
    if is_env_defaultish "ADMIN_EMAIL" "$root_admin_emails"; then
      root_admin_emails="$(prompt_value "Root 管理员邮箱，多个邮箱用英文逗号分隔" "admin@example.com")"
    fi
  else
    root_admin_emails="$(read_env_value "$env_file" "ROOT_ADMIN_EMAILS")"
  fi

  if [[ "$app_base_url" == https://* ]]; then
    session_cookie_secure="true"
  else
    session_cookie_secure="false"
  fi

  trusted_origins="$(resolve_env_value "$env_file" "TRUSTED_ORIGINS" "$app_base_url")"
  session_cookie_secure="$(resolve_env_value "$env_file" "SESSION_COOKIE_SECURE" "$session_cookie_secure")"
  session_secret="$(resolve_env_value "$env_file" "SESSION_SECRET" "$(generate_secret)")"
  settings_encryption_key="$(resolve_env_value "$env_file" "SETTINGS_ENCRYPTION_KEY" "$(generate_secret)")"

  fill_env_value "$env_file" "POSTGRES_DB" "$postgres_db"
  fill_env_value "$env_file" "POSTGRES_USER" "$postgres_user"
  fill_env_value "$env_file" "POSTGRES_PASSWORD" "$postgres_password"
  fill_env_value "$env_file" "DATABASE_URL" "$database_url"
  fill_env_value "$env_file" "APP_BASE_URL" "$app_base_url"
  fill_env_value "$env_file" "TRUSTED_ORIGINS" "$trusted_origins"
  fill_env_value "$env_file" "SESSION_SECRET" "$session_secret"
  fill_env_value "$env_file" "SESSION_COOKIE_SECURE" "$session_cookie_secure"
  fill_env_value "$env_file" "SETTINGS_ENCRYPTION_KEY" "$settings_encryption_key"
  fill_env_value "$env_file" "ROOT_ADMIN_EMAILS" "$root_admin_emails"

  chown "$SERVICE_USER:$SERVICE_USER" "$env_file"
  chmod 640 "$env_file"

  if [ "$env_created" = "true" ]; then
    print_success ".env 已生成并完成默认值补全，敏感随机值不会输出到日志"
  else
    print_success ".env 默认值检查完成，真实配置已保留"
  fi

  local ai_key
  ai_key="$(read_env_value "$env_file" "AI_API_KEY")"
  if [ -z "$ai_key" ] || [ "$ai_key" = "replace-with-your-ai-key" ]; then
    print_warning "AI_API_KEY 仍是占位值。应用可启动，但 AI 生成功能需要后续在 .env 或后台配置真实服务商。"
  fi
}

docker_compose_command() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    echo "docker-compose"
  else
    return 1
  fi
}

maybe_start_postgres() {
  local should_start="false"

  if [ "$USE_DOCKER_DB" = "true" ]; then
    should_start="true"
  elif [ "$USE_DOCKER_DB" = "auto" ] && [ -f "$APP_DIR/docker-compose.yml" ]; then
    local database_url
    database_url="$(read_env_value "$APP_DIR/.env" "DATABASE_URL")"
    if [[ "$database_url" == *"@127.0.0.1:5432/"* ]] || [[ "$database_url" == *"@localhost:5432/"* ]]; then
      should_start="true"
    fi
  fi

  if [ "$should_start" != "true" ]; then
    return
  fi

  local compose_cmd
  if ! compose_cmd="$(docker_compose_command)"; then
    print_warning "未检测到 Docker Compose，将使用已有 PostgreSQL。若数据库不可达，后续迁移会失败。"
    return
  fi

  print_info "启动 PostgreSQL 容器"
  (cd "$APP_DIR" && $compose_cmd up -d postgres)
}

parse_database_endpoint() {
  local database_url="$1"
  node - "$database_url" <<'NODE'
const value = process.argv[2];
try {
  const url = new URL(value);
  process.stdout.write(`${url.hostname} ${url.port || "5432"}`);
} catch {
  process.exit(1);
}
NODE
}

wait_for_tcp() {
  local host="$1"
  local port="$2"
  local attempts="${3:-30}"

  print_info "等待数据库端口：$host:$port"
  for _ in $(seq 1 "$attempts"); do
    if (echo > "/dev/tcp/$host/$port") >/dev/null 2>&1; then
      print_success "数据库端口已可访问"
      return
    fi
    sleep 2
  done

  print_error "数据库端口不可访问：$host:$port"
  print_error "请检查 DATABASE_URL，或安装 PostgreSQL / 启用 Docker 后重试。"
  exit 1
}

wait_for_database() {
  local database_url
  database_url="$(read_env_value "$APP_DIR/.env" "DATABASE_URL")"
  if [ -z "$database_url" ]; then
    print_error ".env 缺少 DATABASE_URL"
    exit 1
  fi

  local endpoint
  if ! endpoint="$(parse_database_endpoint "$database_url")"; then
    print_error "DATABASE_URL 格式无法解析"
    exit 1
  fi

  local db_host db_port
  read -r db_host db_port <<< "$endpoint"
  wait_for_tcp "$db_host" "$db_port" 30
}

install_dependencies_and_build() {
  print_info "安装依赖"
  if [ -f "$APP_DIR/package-lock.json" ]; then
    run_as_app_user "npm ci --include=dev"
  else
    run_as_app_user "npm install"
  fi

  print_info "执行数据库迁移"
  run_as_app_user "npx prisma migrate deploy"

  print_info "构建生产版本"
  run_as_app_user "npm run build"
}

configure_pm2_startup() {
  local pm2_bin
  pm2_bin="$(command -v pm2)"

  print_info "配置 PM2 开机自启"
  env PATH="$PATH" "$pm2_bin" startup systemd -u "$SERVICE_USER" --hp "$SERVICE_HOME" >/dev/null 2>&1 || true
  systemctl enable "pm2-$SERVICE_USER" >/dev/null 2>&1 || true
}

start_pm2_processes() {
  local pm2_bin npm_bin app_name_quoted worker_name worker_name_quoted port_quoted
  pm2_bin="$(command -v pm2)"
  npm_bin="$(command -v npm)"
  app_name_quoted="$(shell_quote "$APP_NAME")"
  worker_name="${APP_NAME}-worker"
  worker_name_quoted="$(shell_quote "$worker_name")"
  port_quoted="$(shell_quote "$PORT")"

  print_info "启动 Web 服务：$APP_NAME"
  if run_as_app_user "$(shell_quote "$pm2_bin") describe $app_name_quoted >/dev/null 2>&1"; then
    run_as_app_user "PORT=$port_quoted NODE_ENV=production $(shell_quote "$pm2_bin") reload $app_name_quoted --update-env"
  else
    run_as_app_user "PORT=$port_quoted NODE_ENV=production $(shell_quote "$pm2_bin") start $(shell_quote "$npm_bin") --name $app_name_quoted -- run start"
  fi

  if [ "$WITH_WORKER" = "true" ]; then
    print_info "启动 GenerationJob Worker：$worker_name"
    if run_as_app_user "$(shell_quote "$pm2_bin") describe $worker_name_quoted >/dev/null 2>&1"; then
      run_as_app_user "NODE_ENV=production $(shell_quote "$pm2_bin") restart $worker_name_quoted --update-env"
    else
      run_as_app_user "NODE_ENV=production $(shell_quote "$pm2_bin") start $(shell_quote "$npm_bin") --name $worker_name_quoted -- run worker:generation"
    fi
  elif run_as_app_user "$(shell_quote "$pm2_bin") describe $worker_name_quoted >/dev/null 2>&1"; then
    print_info "WITH_WORKER=false，移除已有 Worker 进程"
    run_as_app_user "$(shell_quote "$pm2_bin") delete $worker_name_quoted"
  fi

  run_as_app_user "$(shell_quote "$pm2_bin") save"
  configure_pm2_startup
}

print_completion() {
  local app_base_url
  app_base_url="$(read_env_value "$APP_DIR/.env" "APP_BASE_URL")"
  if [ -z "$app_base_url" ]; then
    app_base_url="http://$(get_public_ip):$PORT"
  fi

  echo ""
  echo "=============================================="
  print_success "Autofanqian 安装完成"
  echo "=============================================="
  echo ""
  echo "项目目录：$APP_DIR"
  echo "运行用户：$SERVICE_USER"
  echo "Web 端口：$PORT"
  echo "访问地址：$app_base_url"
  echo ""
  echo "常用命令："
  echo "  sudo -u $SERVICE_USER pm2 status"
  echo "  sudo -u $SERVICE_USER pm2 logs $APP_NAME"
  echo "  sudo -u $SERVICE_USER pm2 restart $APP_NAME"
  echo "  sudo -u $SERVICE_USER pm2 restart ${APP_NAME}-worker"
  echo ""
  echo "后续请检查 .env 中的 AI、SMTP、管理员邮箱和反向代理/HTTPS 配置。"
  echo "=============================================="
}

install() {
  check_root
  check_linux
  check_runtime
  create_service_user
  sync_repository
  prepare_env_file
  maybe_start_postgres
  wait_for_database
  install_dependencies_and_build
  start_pm2_processes
  print_completion
}

update() {
  check_root
  check_linux
  check_runtime
  create_service_user
  sync_repository
  prepare_env_file
  maybe_start_postgres
  wait_for_database
  install_dependencies_and_build
  start_pm2_processes
  print_success "更新完成"
}

doctor() {
  check_root
  check_runtime

  local pm2_bin
  pm2_bin="$(command -v pm2)"

  echo "项目目录：$APP_DIR"
  echo "运行用户：$SERVICE_USER"
  echo ""
  if id "$SERVICE_USER" >/dev/null 2>&1; then
    run_as_service_user "$(shell_quote "$pm2_bin") status"
  else
    print_warning "系统用户不存在：$SERVICE_USER"
  fi
}

uninstall() {
  check_root
  check_linux
  confirm_or_exit "这会停止并删除 PM2 进程"

  local pm2_bin=""
  if command -v pm2 >/dev/null 2>&1; then
    pm2_bin="$(command -v pm2)"
  fi

  if [ -n "$pm2_bin" ] && id "$SERVICE_USER" >/dev/null 2>&1; then
    local app_name_quoted worker_name_quoted
    app_name_quoted="$(shell_quote "$APP_NAME")"
    worker_name_quoted="$(shell_quote "${APP_NAME}-worker")"
    run_as_service_user "$(shell_quote "$pm2_bin") delete $app_name_quoted >/dev/null 2>&1 || true"
    run_as_service_user "$(shell_quote "$pm2_bin") delete $worker_name_quoted >/dev/null 2>&1 || true"
    run_as_service_user "$(shell_quote "$pm2_bin") save >/dev/null 2>&1 || true"
  fi

  if [ "$PURGE" = "true" ]; then
    confirm_or_exit "PURGE=true 会删除 $APP_DIR 和系统用户 $SERVICE_USER"
    rm -rf "$APP_DIR"
    userdel -r "$SERVICE_USER" >/dev/null 2>&1 || true
  fi

  print_success "卸载完成"
}

main() {
  parse_args "$@"

  case "$COMMAND" in
    install) install ;;
    update) update ;;
    doctor) doctor ;;
    uninstall) uninstall ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
