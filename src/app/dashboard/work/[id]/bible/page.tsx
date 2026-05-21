"use client";

import { useParams } from "next/navigation";

import { StoryBibleView } from "@/components/workbench/story-bible-view";
import { WorkLoadingScreen } from "@/components/workbench/work-loading-screen";
import { useStoryBible } from "@/lib/workbench/use-story-bible";

export default function WorkStoryBiblePage() {
  const params = useParams();
  const workId = typeof params?.id === "string" ? params.id : "";
  const bible = useStoryBible(workId);

  if (bible.loading && !bible.data.characters.length) {
    return <WorkLoadingScreen label="正在加载故事圣经..." />;
  }

  return <StoryBibleView bible={bible} workId={workId} />;
}
