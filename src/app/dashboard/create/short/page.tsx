"use client";

import { ShortStoryCreateView } from "@/frontend/features/create/short-story-create-view";
import { useShortStoryCreate } from "@/lib/create/use-short-story-create";

export default function DashboardCreateShortPage() {
  const create = useShortStoryCreate();

  return <ShortStoryCreateView create={create} />;
}
