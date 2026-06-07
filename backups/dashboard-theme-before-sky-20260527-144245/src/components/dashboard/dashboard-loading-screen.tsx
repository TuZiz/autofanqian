"use client";

import { AppShell, LoadingSkeleton, SectionCard } from "@/components/design-system";

export function DashboardLoadingScreen() {
  return (
    <AppShell maxWidthClassName="max-w-[1440px]">
      <div className="space-y-4">
        <SectionCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <LoadingSkeleton className="h-4 w-32" />
              <LoadingSkeleton className="h-8 w-64" />
              <LoadingSkeleton className="h-4 w-80 max-w-full" />
            </div>
            <LoadingSkeleton className="h-11 w-36" />
          </div>
        </SectionCard>
        <div className="grid gap-3 md:grid-cols-3">
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
          <LoadingSkeleton className="h-28" />
        </div>
        <div className="grid gap-3">
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
          <LoadingSkeleton className="h-32" />
        </div>
      </div>
    </AppShell>
  );
}
