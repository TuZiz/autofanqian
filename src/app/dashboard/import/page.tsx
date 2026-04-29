import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

export default function DashboardImportPage() {
  return (
    <main className="theme-page relative min-h-screen overflow-hidden font-sans transition-[background-color,color]">
      <div className="pointer-events-none absolute inset-0 theme-app-surface" />
      <div className="pointer-events-none absolute inset-0 theme-app-grid" />
      <div className="pointer-events-none absolute inset-0 theme-app-vignette" />
      <div className="pointer-events-none absolute inset-0 app-noise theme-app-noise" />

      <DashboardTopbar title="导入作品" showBackToDashboard showAdminLink={false} />

      <section className="relative z-10 mx-auto max-w-4xl px-6 py-10 lg:py-12">
        <div className="glass-panel rounded-lg p-8 shadow-sm lg:p-10">
          <div className="theme-kicker text-sm font-medium">后续预留</div>
          <h1 className="theme-heading mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            导入作品功能即将接入
          </h1>
          <p className="theme-subheading mt-4 max-w-2xl leading-relaxed">
            入口会继续保留，方便后续接入本地作品导入。当前版本暂不上传或解析文件，避免在没有导出闭环前造成误操作。
          </p>

          <div className="theme-card-soft mt-8 rounded-lg p-6">
            <div className="theme-heading text-sm font-semibold">建议接入方式</div>
            <p className="theme-muted mt-3 text-sm leading-relaxed">
              上传区、文件列表、导入进度和结果提示都已经有可复用的主题变量，新增组件时不需要再写一套浅色和深色配色。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
