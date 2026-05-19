import type { EmailVerificationPurpose } from "@prisma/client";

// ==========================================
// Types & Interfaces
// ==========================================

type VerificationMailCopy = {
  accent: string;
  accentSoft: string;
  badge: string;
  headline: string;
  lead: string;
  title: string;
};

type VerificationMailTemplateInput = {
  code: string;
  fromName: string;
  purpose: EmailVerificationPurpose;
};

// ==========================================
// Constants & Configuration
// ==========================================

const PURPOSE_COPY: Record<EmailVerificationPurpose, VerificationMailCopy> = {
  register: {
    accent: "#059669",     // 调整为更现代的翠绿色 (Tailwind Emerald-600)
    accentSoft: "#D1FAE5", // 配合 Emerald-100
    badge: "注册验证码",
    headline: "欢迎加入，请验证您的邮箱",
    lead: "这是您注册账号所需的验证码，请在验证流程中输入。",
    title: "注册验证码",
  },
  reset_password: {
    accent: "#4F46E5",     // 调整为更现代的靛蓝色 (Tailwind Indigo-600)
    accentSoft: "#E0E7FF", // 配合 Indigo-100
    badge: "安全验证码",
    headline: "重置您的账号密码",
    lead: "这是您修改密码所需的验证码，请在验证流程中输入。",
    title: "找回密码验证码",
  },
};

// ==========================================
// Utilities
// ==========================================

/**
 * 转义 HTML 特殊字符，防止 XSS 注入
 */
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// ==========================================
// Template Generator
// ==========================================

export function buildVerificationEmailHtml({
  code,
  fromName,
  purpose,
}: VerificationMailTemplateInput): string {
  const copy = PURPOSE_COPY[purpose];
  const safeCode = escapeHtml(code);
  const safeFromName = escapeHtml(fromName);
  const currentYear = new Date().getFullYear();

  // 邮件的响应式样式
  const cssStyles = `
    @media only screen and (max-width: 620px) {
      .mail-shell { width: 100% !important; padding: 0 16px !important; box-sizing: border-box !important; }
      .mail-card { border-radius: 20px !important; }
      .mail-pad { padding: 32px 24px !important; }
      .mail-code { font-size: 34px !important; letter-spacing: 6px !important; }
    }
  `;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${copy.title}</title>
  <style>${cssStyles}</style>
</head>

<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #1E293B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif; -webkit-font-smoothing: antialiased;">
  
  <!-- 邮件预览摘要文本（不可见） -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
    您的验证码是 ${safeCode}，有效期为 10 分钟。请勿泄露给他人。
  </div>

  <!-- 外层主背景 -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; padding: 40px 0;">
    <tr>
      <td align="center">
        
        <!-- 邮件内容容器 -->
        <table role="presentation" class="mail-shell" width="560" cellpadding="0" cellspacing="0" style="width: 560px; max-width: 100%; margin: 0 auto;">
          
          <!-- Header: 品牌名称 & 有效期 -->
          <tr>
            <td style="padding: 0 8px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;">
                    ${safeFromName}
                  </td>
                  <td align="right" style="font-size: 13px; font-weight: 600; color: #64748B;">
                    🕒 10 分钟内有效
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td class="mail-card" style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <!-- 卡片内容区 -->
                <tr>
                  <td class="mail-pad" style="padding: 40px 48px;">
                    
                    <!-- Badge -->
                    <div style="display: inline-block; border-radius: 9999px; background-color: ${copy.accentSoft}; padding: 6px 14px; font-size: 12px; font-weight: 700; color: ${copy.accent};">
                      ${copy.badge}
                    </div>
                    
                    <!-- 标题与引导语 -->
                    <h1 style="margin: 24px 0 12px; font-size: 24px; line-height: 1.4; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;">
                      ${copy.headline}
                    </h1>
                    <p style="margin: 0 0 32px; font-size: 15px; line-height: 1.6; color: #475569;">
                      ${copy.lead}
                    </p>

                    <!-- 验证码展示框 -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                      <tr>
                        <td align="center" style="border: 1px dashed #CBD5E1; border-radius: 16px; background-color: #F8FAFC; padding: 28px 20px;">
                          <div style="margin-bottom: 8px; font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #64748B;">邮箱验证码</div>
                          <div class="mail-code" style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 44px; line-height: 1; font-weight: 800; letter-spacing: 8px; color: ${copy.accent};">
                            ${safeCode}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- 安全提醒提示框 -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius: 12px; background-color: #FFF7ED; border: 1px solid #FFEDD5;">
                      <tr>
                        <td style="padding: 16px 20px; font-size: 14px; line-height: 1.6; color: #9A3412;">
                          <div style="font-weight: 700; margin-bottom: 4px; display: flex; align-items: center;">
                            <span style="margin-right: 6px;">🛡️</span> 安全提醒
                          </div>
                          <div style="color: #C2410C;">
                            请勿将此验证码转发或透露给任何人（包括客服人员）。
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- 忽略提醒 -->
                    <p style="margin: 32px 0 0; font-size: 13px; line-height: 1.6; color: #94A3B8; text-align: center;">
                      如果这不是您本人的操作，请忽略此邮件。您的账号安全不会受到影响。
                    </p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer: 版权与说明 -->
          <tr>
            <td align="center" style="padding: 32px 16px 0; font-size: 13px; line-height: 1.6; color: #94A3B8;">
              <p style="margin: 0 0 8px;">这是一封系统自动发送的邮件，请勿直接回复。</p>
              <div style="height: 1px; background-color: #E2E8F0; width: 40px; margin: 12px auto;"></div>
              <p style="margin: 0;">&copy; ${currentYear} ${safeFromName} 版权所有</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}
