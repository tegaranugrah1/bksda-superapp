import { cn } from "@/lib/utils";
import { Tag as TagIcon } from "lucide-react";
import { getTagColorClasses, type IBmnTag } from "../_lib/tag-utils";

interface TagBadgeProps {
  tag: IBmnTag | { id: string; name: string; label: string; color?: string };
  size?: "sm" | "md";
  className?: string;
}

export function TagBadge({ tag, size = "sm", className }: TagBadgeProps) {
  const colorTheme = getTagColorClasses(tag.color);
  const isSub = Boolean((tag as IBmnTag).parent_id || (tag as IBmnTag).is_sub_tag);

  return (
    <span
      title={isSub ? `Sub-tag: ${tag.label || `#${tag.name}`}` : `Main tag: ${tag.label || `#${tag.name}`}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold border transition-colors shrink-0",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        colorTheme.bg,
        colorTheme.text,
        colorTheme.border,
        className
      )}
    >
      {isSub ? (
        <span className="font-mono text-[10px] leading-none opacity-80 -mr-0.5 select-none font-bold">↳</span>
      ) : (
        <TagIcon className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      )}
      {tag.label || `#${tag.name}`}
    </span>
  );
}
