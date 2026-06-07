import { FileText, Layers3, Loader2, Target } from "lucide-react";

import type { WorkChapterEditorController } from "@/lib/workbench/use-work-chapter-editor";
import { cn } from "@/lib/utils";
import {
  DialogFrame,
  DialogHeader,
  DisabledHint,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "./chapter-editor-dialog-shell";

export function MetaEditorDialog({ editor }: { editor: WorkChapterEditorController }) {
  const {
    handleConfirmMetaEditor,
    metaEditorKind,
    metaEditorValue,
    metaSaving,
    setMetaEditorKind,
    setMetaEditorValue,
  } = editor;

  if (!metaEditorKind) return null;

  const metaEditorConfig =
    metaEditorKind === "summary"
      ? {
          description: "可手动修正 AI 生成内容；保存后会同步到右侧章节摘要卡片。",
          icon: <FileText className="h-5 w-5" />,
          kicker: "章节摘要",
          limit: 12_000,
          placeholder: "输入本章摘要",
          rows: 7,
          saveHint: "摘要将同步到右侧章节摘要卡。",
          title: "编辑章节摘要",
        }
      : metaEditorKind === "outline"
        ? {
            description: "可手动修正 AI 生成内容；保存后会同步到右侧目标卡与章节大纲卡。",
            icon: <Layers3 className="h-5 w-5" />,
            kicker: "章节大纲",
            limit: 24_000,
            placeholder: "输入本章大纲",
            rows: 8,
            saveHint: "大纲将同步到右侧目标卡与章节大纲卡。",
            title: "编辑章节大纲",
          }
        : {
            description:
              "按行整理人物关系、关键道具、时间线或能力规则；保存后会同步到右侧细节设定卡。",
            icon: <Target className="h-5 w-5" />,
            kicker: "细节设定",
            limit: 80_000,
            placeholder: "一行一条设定：人物关系、关键道具、时间线、能力规则...",
            rows: 10,
            saveHint: "细节设定会按行保存，并同步到右侧细节设定卡。",
            title: "编辑细节设定",
          };
  const limit = metaEditorConfig.limit;
  const disabledReason = metaSaving ? "正在保存章节信息，请稍后。" : "";

  return (
    <DialogFrame
      ariaLabelledBy="meta-editor-title"
      closeDisabled={metaSaving}
      onCancel={() => setMetaEditorKind(null)}
    >
      <DialogHeader
        closeDisabled={metaSaving}
        description={metaEditorConfig.description}
        icon={metaEditorConfig.icon}
        kicker={metaEditorConfig.kicker}
        onCancel={() => setMetaEditorKind(null)}
        title={metaEditorConfig.title}
        titleId="meta-editor-title"
      />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-6">
        <textarea
          autoFocus
          value={metaEditorValue}
          onChange={(event) => setMetaEditorValue(event.target.value.slice(0, limit))}
          rows={metaEditorConfig.rows}
          placeholder={metaEditorConfig.placeholder}
          className={cn(textareaClass, "h-[min(34vh,320px)] min-h-[200px] resize-y")}
        />
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--theme-surface-soft)] px-5 py-4 text-xs font-bold text-[var(--theme-text-muted)] shadow-inner ring-1 ring-[var(--theme-border)] sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 truncate">{metaEditorConfig.saveHint}</span>
          <span className="shrink-0 tabular-nums">
            {metaEditorValue.length}/{limit}
          </span>
        </div>
        {disabledReason ? <DisabledHint>{disabledReason}</DisabledHint> : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--theme-border)] bg-[var(--theme-surface-soft)] px-6 py-5 sm:flex-row sm:justify-end">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => setMetaEditorKind(null)}
          disabled={metaSaving}
          title={metaSaving ? "正在保存，暂时不能关闭。" : "取消"}
        >
          取消
        </button>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={handleConfirmMetaEditor}
          disabled={metaSaving}
          title={disabledReason || "保存"}
        >
          {metaSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          保存
        </button>
      </div>
    </DialogFrame>
  );
}
