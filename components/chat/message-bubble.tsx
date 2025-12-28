"use client";

import { Message } from "@/types/chat";
import { ThoughtProcess } from "./thought-process";
import { MarkdownContent } from "./markdown-content";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 max-w-4xl",
        isUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser
            ? "bg-gradient-to-br from-blue-500 to-indigo-600"
            : "bg-gradient-to-br from-purple-500 to-pink-500"
        )}
      >
        {isUser ? (
          <User className="size-4 text-white" />
        ) : (
          <Bot className="size-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn("flex flex-col flex-1 min-w-0", isUser && "items-end")}>
        {/* Role Label */}
        <span
          className={cn(
            "text-xs font-medium mb-1",
            isUser ? "text-blue-600 dark:text-blue-400" : "text-slate-500"
          )}
        >
          {isUser ? "You" : "DeepThink AI"}
        </span>

        {/* Thought Process (Assistant only) */}
        {isAssistant && message.thoughts && (
          <ThoughtProcess thoughts={message.thoughts} />
        )}

        {/* Message Bubble */}
        <div
          className={cn(
            "px-4 py-3 rounded-2xl max-w-full overflow-hidden",
            isUser
              ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-tr-sm"
              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 rounded-tl-sm"
          )}
        >
          <div className="text-sm">
            <MarkdownContent 
              content={message.content} 
              variant={isUser ? "user" : "default"}
            />
          </div>
        </div>

        {/* Timestamp */}
        <span
          className={cn(
            "text-[10px] text-slate-400 mt-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
