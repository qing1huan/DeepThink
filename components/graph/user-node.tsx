"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { GraphNodeData } from "@/lib/graph-utils";

function UserNodeComponent({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-xl min-w-[250px] max-w-[280px]",
        "bg-gradient-to-br from-blue-500 to-indigo-600",
        "border border-blue-400/50",
        "shadow-lg shadow-blue-500/25",
        "transition-all duration-200",
        selected && "ring-2 ring-blue-300 ring-offset-2"
      )}
    >
      {/* Input Handle (hidden for first node) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-300 !border-blue-400 !w-3 !h-3"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20">
          <User className="size-3.5 text-white" />
        </div>
        <span className="text-xs font-semibold text-white/90 uppercase tracking-wide">
          {data.label}
        </span>
      </div>

      {/* Content Preview */}
      <p className="text-sm text-white/95 leading-relaxed line-clamp-2">
        {data.content}
      </p>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-300 !border-blue-400 !w-3 !h-3"
      />
    </div>
  );
}

export const UserNode = memo(UserNodeComponent);

