# 邮箱认证前端对接说明

这份文档对应当前项目里的邮箱账号体系 V1。

已实现能力：

- 邮箱 + 密码登录
- 邮箱验证码注册
- 邮箱验证码找回密码
- 注册成功后自动登录
- 找回密码成功后跳回登录页
- Cookie 会话鉴权
- `/dashboard` 路由保护

当前没有实现页面 UI，只提供了占位页和完整 JSON 接口。

## 页面清单

### 1. `/login`

字段：

- `email`
- `password`

交互：

- 点击登录时调用 `POST /api/auth/login`
- 成功后读取返回里的 `data.redirectTo`，跳转到 `/dashboard`
- 如果是前后端同域，浏览器会自动收下 Cookie
- 如果未来前后端分域，请求必须带 `credentials: "include"`

页面元素建议：

- 邮箱输入框
- 密码输入框
- 登录按钮
- 去注册链接
- 忘记密码链接
- 表单错误提示区

### 2. `/register`

字段：

- `email`
- `code`
- `password`
- `confirmPassword`

交互：

- “发送验证码” 调用 `POST /api/auth/register/send-code`
- “注册” 调用 `POST /api/auth/register/confirm`
- 注册成功后跳转到 `/dashboard`

页面元素建议：

- 邮箱输入框
- 发送验证码按钮
- 验证码输入框
- 密码输入框
- 确认密码输入框
- 注册按钮
- 验证码倒计时和重发态
- 错误提示区

### 3. `/forgot-password`

字段：

- `email`
- `code`
- `newPassword`
- `confirmPassword`

交互：

- “发送验证码” 调用 `POST /api/auth/password/send-code`
- “重置密码” 调用 `POST /api/auth/password/reset`
- 重置成功后跳转到 `/login`

页面元素建议：

- 邮箱输入框
- 发送验证码按钮
- 验证码输入框
- 新密码输入框
- 确认密码输入框
- 提交按钮
- 验证码倒计时和重发态
- 错误提示区

### 4. `/dashboard`

说明：

- 这是受保护页面
- 未登录访问会被服务端重定向到 `/login`
- 已登录用户访问 `/login`、`/register`、`/forgot-password` 会被重定向到 `/dashboard`

## 统一响应格式

成功：

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {}
}
```

失败：

```json
{
  "success": false,
  "message": "Request validation failed.",
  "fieldErrors": {
    "email": ["Please enter a valid email address."]
  }
}
```

说明：

- `message` 可以直接做 toast 或表单总错误提示
- `fieldErrors` 可直接映射到字段级错误
- 登录、注册成功时会同时写入会话 Cookie

## 接口清单

### `POST /api/auth/register/send-code`

用途：

- 给未注册邮箱发送注册验证码

请求体：

```json
{
  "email": "user@example.com"
}
```

成功响应：

```json
{
  "success": true,
  "message": "Registration verification code sent.",
  "data": {
    "email": "user@example.com",
    "expiresInSeconds": 600,
    "resendAfterSeconds": 60
  }
}
```

常见失败：

- `400` 邮箱格式不合法
- `409` 邮箱已注册
- `429` 60 秒内重复发送

### `POST /api/auth/register/confirm`

用途：

- 校验验证码并注册账号

请求体：

```json
{
  "email": "user@example.com",
  "code": "123456",
  "password": "123456"
}
```

成功响应：

```json
{
  "success": true,
  "message": "Registration completed successfully.",
  "data": {
    "redirectTo": "/dashboard",
    "user": {
      "id": "xxx",
      "email": "user@example.com",
      "name": null,
      "emailVerified": true,
      "lastLoginAt": "2026-04-21T00:00:00.000Z",
      "createdAt": "2026-04-21T00:00:00.000Z"
    }
  }
}
```

常见失败：

- `400` 验证码错误
- `400` 验证码过期
- `400` 密码少于 6 位
- `409` 邮箱已注册

### `POST /api/auth/login`

用途：

- 邮箱密码登录

请求体：

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

成功响应：

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "redirectTo": "/dashboard",
    "user": {
      "id": "xxx",
      "email": "user@example.com",
      "name": null,
      "emailVerified": true,
      "lastLoginAt": "2026-04-21T00:00:00.000Z",
      "createdAt": "2026-04-21T00:00:00.000Z"
    }
  }
}
```

常见失败：

- `404` 邮箱未注册
- `401` 密码错误
- `400` 请求字段缺失

### `POST /api/auth/password/send-code`

用途：

- 给已注册邮箱发送找回密码验证码

请求体：

```json
{
  "email": "user@example.com"
}
```

成功响应：

```json
{
  "success": true,
  "message": "Password reset verification code sent.",
  "data": {
    "email": "user@example.com",
    "expiresInSeconds": 600,
    "resendAfterSeconds": 60
  }
}
```

常见失败：

- `404` 邮箱未注册
- `429` 60 秒内重复发送

### `POST /api/auth/password/reset`

用途：

- 验证验证码并重置密码

请求体：

```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "654321"
}
```

成功响应：

```json
{
  "success": true,
  "message": "Password reset successful.",
  "data": {
    "redirectTo": "/login",
    "user": {
      "id": "xxx",
      "email": "user@example.com",
      "name": null,
      "emailVerified": true,
      "lastLoginAt": "2026-04-21T00:00:00.000Z",
      "createdAt": "2026-04-21T00:00:00.000Z"
    }
  }
}
```

常见失败：

- `404` 邮箱未注册
- `400` 验证码错误
- `400` 验证码过期
- `400` 新密码少于 6 位

### `POST /api/auth/logout`

用途：

- 退出登录并清理会话 Cookie

请求体：

- 无

成功响应：

```json
{
  "success": true,
  "message": "Logout successful.",
  "data": {
    "redirectTo": "/login"
  }
}
```

### `GET /api/auth/session`

用途：

- 获取当前登录用户

成功响应：

```json
{
  "success": true,
  "message": "Session loaded.",
  "data": {
    "user": {
      "id": "xxx",
      "email": "user@example.com",
      "name": null,
      "emailVerified": true,
      "lastLoginAt": "2026-04-21T00:00:00.000Z",
      "createdAt": "2026-04-21T00:00:00.000Z"
    }
  }
}
```

未登录响应：

```json
{
  "success": false,
  "message": "You are not authenticated."
}
```

## 前端接入顺序

建议按这个顺序接：

1. 先接 `GET /api/auth/session`，决定首屏跳转和登录态初始化
2. 再接 `POST /api/auth/login`，把登录闭环打通
3. 再接注册页两个接口
4. 最后接找回密码两个接口

## 前端实现注意点

- 注册页和找回页都要自己做“确认密码一致”校验，后端当前只校验单个密码字段长度
- 验证码输入框最好限制为 6 位数字
- 成功后以前端读取 `data.redirectTo` 做跳转，不要写死
- 如果未来把前端拆到别的域名，请求必须带 `credentials: "include"`，同时后端 Cookie 策略也要跟着改
