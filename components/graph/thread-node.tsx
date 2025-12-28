"use client";

import { memo, useRef, useEffect, useCallback } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { GitBranch, MessageSquare, Sparkles, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThreadNodeData } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { ThoughtProcess } from "@/components/chat/thought-process";

function ThreadNodeComponent({ data, selected }: NodeProps<ThreadNodeData>) {
  const { thread, isActive, onSetActive, onBranch, onNavigateToChat } = data;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current && isActive) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [thread.messages.length, isActive]);

  // Single click sets active, double click navigates to chat
  const handleNodeClick = useCallback(() => {
    if (isActive) {
      // Already active, navigate to chat
      onNavigateToChat(thread.id);
    } else {
      // Set as active first
      onSetActive(thread.id);
    }
  }, [isActive, onSetActive, onNavigateToChat, thread.id]);

  // Double click always navigates to chat
  const handleDoubleClick = useCallback(() => {
    onNavigateToChat(thread.id);
  }, [onNavigateToChat, thread.id]);

  const handleBranch = useCallback((e: React.MouseEvent, messageId: string) => {
    e.stopPropagation();
    e.preventDefault();
    onBranch(thread.id, messageId);
    // After branching, switch to chat mode for the new branch
    // The branch creation will set the new thread as active
    // and onNavigateToChat will be called in context
  }, [onBranch, thread.id]);

  // Prevent wheel events from propagating to canvas
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      onClick={handleNodeClick}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "w-[400px] rounded-xl overflow-hidden cursor-pointer",
        "bg-white dark:bg-slate-900",
        "border-2 transition-all duration-200",
        "shadow-xl",
        isActive 
          ? "border-indigo-500 ring-4 ring-indigo-500/20 shadow-indigo-500/20" 
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
        selected && !isActive && "ring-2 ring-blue-400"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-indigo-500 !border-indigo-600 !w-3 !h-3"
      />

      {/* Thread Header - nodrag to allow text selection */}
      <div className={cn(
        "px-4 py-3 border-b nodrag",
        isActive 
          ? "bg-gradient-to-r from-indigo-500 to-purple-500 border-transparent" 
          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              isActive ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"
            )}>
              <MessageSquare className={cn(
                "size-4",
                isActive ? "text-white" : "text-slate-600 dark:text-slate-400"
              )} />
            </div>
            <div>
              <h3 className={cn(
                "text-sm font-semibold truncate max-w-[220px]",
                isActive ? "text-white" : "text-slate-800 dark:text-slate-200"
              )}>
                {thread.title}
              </h3>
              <p className={cn(
                "text-xs",
                isActive ? "text-white/70" : "text-slate-500"
              )}>
                {thread.messages.length} messages
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isActive && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                <Sparkles className="size-3" />
                Active
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToChat(thread.id);
              }}
              className={cn(
                "h-7 px-2 text-xs",
                isActive 
                  ? "text-white hover:bg-white/20" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
              title="Open in Chat Mode"
            >
              <ExternalLink className="size-3.5 mr-1" />
              Chat
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Container - nopan & nowheel to prevent canvas interactions */}
      <div 
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className={cn(
          "max-h-[400px] overflow-y-auto p-3",
          "nopan nodrag", // React Flow classes to prevent pan/drag
          "scrollbar-thin"
        )}
      >
        {thread.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <MessageSquare className="size-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">
              {isActive ? "Start typing to begin..." : "Empty thread"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {thread.messages.map((message) => (
              <div key={message.id} className="group relative">
                {/* Message Bubble */}
                <div
                  className={cn(
                    "relative rounded-xl px-3 py-2",
                    "nodrag", // Allow text selection
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white ml-10"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-10"
                  )}
                >
                  {/* Role Label */}
                  <p className={cn(
                    "text-[10px] font-medium mb-1 select-none",
                    message.role === "user" 
                      ? "text-white/70" 
                      : "text-slate-500 dark:text-slate-400"
                  )}>
                    {message.role === "user" ? "You" : "AI"}
                  </p>
                  
                  {/* Thought Process (collapsed in node view) */}
                  {message.role === "assistant" && message.thoughts && (
                    <div className="mb-2">
                      <ThoughtProcess thoughts={message.thoughts} className="!mb-0" />
                    </div>
                  )}
                  
                  {/* Content - selectable text */}
                  <p className="text-xs leading-relaxed line-clamp-6 select-text cursor-text">
                    {message.content}
                  </p>
                </div>
                
                {/* Branch Button - Only for assistant messages, visible on hover */}
                {message.role === "assistant" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleBranch(e, message.id)}
                    className={cn(
                      "absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+8px)]",
                      "opacity-0 group-hover:opacity-100",
                      "transition-all duration-200",
                      "h-8 w-8 p-0 rounded-full",
                      "bg-gradient-to-br from-indigo-500 to-purple-600",
                      "hover:from-indigo-600 hover:to-purple-700",
                      "text-white",
                      "shadow-lg shadow-indigo-500/30",
                      "hover:scale-110",
                      "nodrag nopan" // Prevent canvas interactions
                    )}
                    title="Create branch from this point"
                  >
                    <GitBranch className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Active Indicator */}
      {isActive && (
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/30 border-t border-indigo-100 dark:border-indigo-900 nodrag">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 text-center">
            ↓ Type below to continue this thread
          </p>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-indigo-500 !border-indigo-600 !w-3 !h-3"
      />
    </div>
  );
}

export const ThreadNode = memo(ThreadNodeComponent);
