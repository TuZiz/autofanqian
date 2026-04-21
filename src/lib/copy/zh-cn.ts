export const zhCN = {
  app: {
    name: "BayData 控制台",
    shortName: "BayData",
    description: "基于 Next.js 与 Prisma 构建的邮箱认证与创作工作台。",
  },
  auth: {
    response: {
      validationFailed: "请求参数校验失败，请检查输入内容。",
      invalidJson: "请求格式错误，无法解析提交的数据。",
      serverError: "服务器处理请求时出现异常，请稍后重试。",
      sessionLoaded: "登录状态已同步。",
      unauthenticated: "身份认证已失效，请重新登录。",
      loginSuccess: "登录成功，欢迎回来。",
      logoutSuccess: "已安全退出登录。",
      registerCodeSent: "验证码已发送，请检查您的邮箱。",
      registerSuccess: "注册成功，正在进入工作台。",
      resetCodeSent: "重置验证码已发送，请注意查收。",
      resetSuccess: "密码重置成功，请使用新密码登录。",
      networkError: "网络连接异常，请检查网络后重试。",
      emptyResponse: "服务器未返回有效内容，请稍后重试。",
    },
    validation: {
      emailRequired: "请输入电子邮箱地址。",
      emailInvalid: "邮箱格式不正确，请重新输入。",
      passwordRequired: "请输入密码。",
      passwordMin: "密码长度不能少于 6 位。",
      codeInvalid: "请输入 6 位数字验证码。",
    },
    error: {
      emailRegistered: "该邮箱已注册，请直接登录。",
      emailNotRegistered: "该邮箱尚未注册，请先创建账号。",
      passwordMissing: "该账号尚未设置密码，请先重置密码。",
      passwordIncorrect: "密码错误，请检查后重试。",
      mailSendFailed: "邮件发送失败，请稍后再试。",
      codeMissing: "验证码不存在或已失效，请重新获取。",
      codeUnavailable: "验证码无效，请重新获取。",
      codeExpired: "验证码已过期，请重新发送。",
      codeIncorrect: "验证码不正确。",
      requestCodeTooFast: (seconds: number) =>
        `操作过快，请在 ${seconds} 秒后重试。`,
      passwordConfirmMismatch: "两次输入的密码不一致。",
      envMissing: (name: string) => `缺少环境变量：${name}。`,
    },
    mail: {
      registerSubject: (fromName: string) => `[${fromName}] 注册验证码`,
      registerText: (code: string) =>
        `您好，您的注册验证码为 ${code}，10 分钟内有效。如非本人操作请忽略。`,
      registerHtml: (code: string) =>
        `<p>您好，</p><p>您的注册验证码是：<strong style="font-size:1.2em;color:#4f46e5;">${code}</strong></p><p>该验证码将在 10 分钟后失效，请尽快完成注册。</p>`,
      resetSubject: (fromName: string) => `[${fromName}] 找回密码验证码`,
      resetText: (code: string) =>
        `您正在重置密码，验证码为 ${code}，10 分钟内有效。如非本人操作请忽略。`,
      resetHtml: (code: string) =>
        `<p>您正在申请重置密码。</p><p>验证码是：<strong style="font-size:1.2em;color:#db2777;">${code}</strong></p><p>该验证码将在 10 分钟后失效，请尽快完成操作。</p>`,
    },
  },
} as const;
