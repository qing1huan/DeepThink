"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { GraphNodeData } from "@/lib/graph-utils";

function AssistantNodeComponent({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-xl min-w-[250px] max-w-[280px]",
        "bg-white dark:bg-slate-800",
        "border border-slate-200 dark:border-slate-700",
        "shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50",
        "transition-all duration-200",
        selected && "ring-2 ring-purple-400 ring-offset-2"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-400 !border-purple-500 !w-3 !h-3"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
          <Bot className="size-3.5 text-white" />
        </div>
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          {data.label}
        </span>
      </div>

      {/* Content Preview */}
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">
        {data.content}
      </p>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-400 !border-purple-500 !w-3 !h-3"
      />
    </div>
  );
}

export const AssistantNode = memo(AssistantNodeComponent);

