"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { GraphNodeData } from "@/lib/graph-utils";

function ThoughtNodeComponent({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg min-w-[250px] max-w-[280px]",
        "bg-gradient-to-br from-amber-50 to-orange-50",
        "border-2 border-dashed border-amber-400",
        "shadow-md shadow-amber-100/50",
        "transition-all duration-200",
        selected && "ring-2 ring-amber-500 ring-offset-2"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-400 !border-amber-500 !w-3 !h-3"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-400/20">
          <Brain className="size-3.5 text-amber-600" />
        </div>
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
          {data.label}
        </span>
      </div>

      {/* Content Preview */}
      <p className="text-xs text-amber-800/80 font-mono leading-relaxed line-clamp-2">
        {data.content}
      </p>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-400 !border-amber-500 !w-3 !h-3"
      />
    </div>
  );
}

export const ThoughtNode = memo(ThoughtNodeComponent);

