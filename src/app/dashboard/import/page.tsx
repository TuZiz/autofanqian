"use client";

import { WorkImportView } from "@/components/import/work-import-view";
import { useWorkImport } from "@/lib/import/use-work-import";

export default function DashboardImportPage() {
  const controller = useWorkImport();

  return <WorkImportView controller={controller} />;
}
