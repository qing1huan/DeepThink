"use client";

import { useRef, useEffect } from "react";
import { Brain, MessageSquare, GitBranch } from "lucide-react";
import { MessageBubble, ChatInput, SelectionMenu, formatQuoteForInput, BRANCH_PROMPTS, BranchAction } from "@/components/chat";
import { useCanvas } from "@/contexts/canvas-context";
import { ThreadNode } from "@/types/canvas";

interface ThreadColumnProps {
    thread: ThreadNode;
    isActive: boolean;
    isReference?: boolean;
    /** Source thread ID to use for branching (allows explicit parent assignment) */
    sourceThreadId?: string;
    onBranchAction?: (
        action: BranchAction,
        selectedText: string,
        sourceMessageId?: string,
        customQuery?: string
    ) => void;
    onQuoteAction?: (selectedText: string) => void;
    onSend?: (content: string) => void;
    isLoading?: boolean;
}

export function ThreadColumn({
    thread,
    isActive,
    isReference = false,
    sourceThreadId,
    onBranchAction,
    onQuoteAction,
    onSend,
    isLoading = false,
}: ThreadColumnProps) {
    const messages = thread?.messages || [];
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Track previous message count to detect new messages
    const prevMessageLengthRef = useRef(messages.length);

    // Only scroll to bottom when NEW messages arrive, not on focus change
    useEffect(() => {
        const currentLength = messages.length;
        const prevLength = prevMessageLengthRef.current;

        // Only scroll if message count increased (new message received/sent)
        if (currentLength > prevLength) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }

        // Update the ref for next comparison
        prevMessageLengthRef.current = currentLength;
    }, [messages.length]);

    return (
        <div className="flex flex-col h-full">
            {/* Thread Header */}
            <div className={`px-4 py-2.5 border-b ${isReference
                ? "bg-slate-100/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-700/60"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                }`}>
                <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isReference ? "bg-indigo-500/5" : "bg-indigo-500/10"
                        }`}>
                        {thread?.parentId ? (
                            <GitBranch className={`size-3.5 ${isReference ? "text-indigo-400" : "text-indigo-600"}`} />
                        ) : (
                            <MessageSquare className={`size-3.5 ${isReference ? "text-indigo-400" : "text-indigo-600"}`} />
                        )}
                    </div>
                    <span className={`text-sm font-medium ${isReference
                        ? "text-slate-500 dark:text-slate-400"
                        : "text-slate-700 dark:text-slate-300"
                        }`}>
                        {thread?.title || "Thread"}
                    </span>
                    <span className="text-xs text-slate-400">
                        · {messages.length} messages
                    </span>
                    {thread?.parentId && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isReference
                            ? "bg-purple-100/60 dark:bg-purple-900/20 text-purple-400 dark:text-purple-500"
                            : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                            }`}>
                            {isReference ? "Reference" : "Branch"}
                        </span>
                    )}
                    {isReference && !thread?.parentId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100/60 dark:bg-blue-900/20 text-blue-400 dark:text-blue-500">
                            Reference
                        </span>
                    )}
                </div>
            </div>

            {/* Messages List */}
            <div
                ref={messagesContainerRef}
                className={`flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin relative ${isReference ? "opacity-90" : ""
                    }`}
                style={{ overflowAnchor: "auto" }}
            >
                {/* Selection Menu - only show for active column */}
                {isActive && onBranchAction && onQuoteAction && (
                    <SelectionMenu
                        containerRef={messagesContainerRef}
                        onBranchAction={onBranchAction}
                        onQuoteAction={onQuoteAction}
                    />
                )}

                {messages.map((message) => (
                    <div key={message.id} data-message-id={message.id}>
                        <MessageBubble message={message} />
                    </div>
                ))}

                {/* Loading indicator - only show for active column */}
                {isActive && isLoading && (
                    <div className="flex gap-3 max-w-4xl mr-auto">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Brain className="size-4 text-white animate-pulse" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-500 mb-1">
                                DeepThink AI
                            </span>
                            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-800">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                    <span className="text-sm text-slate-500">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input - only show for active column */}
            {isActive && onSend && (
                <ChatInput onSend={onSend} disabled={isLoading} />
            )}
        </div>
    );
}
