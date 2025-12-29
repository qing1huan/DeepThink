"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThreadNode } from "@/types/canvas";
import { ThreadColumn } from "./thread-column";
import { BranchAction } from "./selection-menu";
import { ChevronLeft, ChevronRight } from "lucide-react";

type FocusSide = "left" | "right" | null;

interface SplitChatLayoutProps {
    parentThread: ThreadNode;
    activeThread: ThreadNode;
    isLoading?: boolean;
    /** Send message to a specific thread (threadId, content) */
    onSendToThread?: (threadId: string, content: string) => void;
    /** Create branch from a specific source thread */
    onBranchFromThread?: (
        sourceThreadId: string,
        action: BranchAction,
        selectedText: string,
        sourceMessageId?: string,
        customQuery?: string
    ) => void;
    onQuoteAction?: (selectedText: string) => void;
}

export function SplitChatLayout({
    parentThread,
    activeThread,
    isLoading = false,
    onSendToThread,
    onBranchFromThread,
    onQuoteAction,
}: SplitChatLayoutProps) {
    // Focus state: null = 50/50, "left" = 70/30 (left focused), "right" = 30/70 (right focused)
    const [focusSide, setFocusSide] = useState<FocusSide>("right"); // Default to right (active thread)
    const [isMobileView, setIsMobileView] = useState(false);
    const [mobileActiveTab, setMobileActiveTab] = useState<"parent" | "child">("child");

    // Check if we need mobile view based on screen width
    useEffect(() => {
        const checkMobileView = () => {
            // Min width for each panel is 320px, so need at least 640px for split view
            setIsMobileView(window.innerWidth < 768);
        };

        checkMobileView();
        window.addEventListener("resize", checkMobileView);
        return () => window.removeEventListener("resize", checkMobileView);
    }, []);

    // Smart click detection - prevents layout switch when selecting text
    const handlePanelClick = useCallback((side: FocusSide) => {
        // Check if user is selecting text
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) {
            // User is selecting text, don't switch layout
            return;
        }

        // Only switch if clicking on the non-focused side
        if (focusSide !== side) {
            setFocusSide(side);
        }
    }, [focusSide]);

    // Calculate panel widths based on focus state
    const getLeftWidth = () => {
        if (focusSide === "left") return "w-[70%]";
        if (focusSide === "right") return "w-[30%]";
        return "w-[50%]"; // null = equal split
    };

    const getRightWidth = () => {
        if (focusSide === "right") return "w-[70%]";
        if (focusSide === "left") return "w-[30%]";
        return "w-[50%]"; // null = equal split
    };

    const isLeftActive = focusSide === "left";
    const isRightActive = focusSide === "right" || focusSide === null;

    // ========================================
    // Panel-specific handlers
    // These ensure correct parent assignment
    // ========================================

    // Left panel (parent thread) handlers
    const handleLeftSend = useCallback((content: string) => {
        onSendToThread?.(parentThread.id, content);
    }, [onSendToThread, parentThread.id]);

    const handleLeftBranchAction = useCallback((
        action: BranchAction,
        selectedText: string,
        sourceMessageId?: string,
        customQuery?: string
    ) => {
        // Branch from LEFT panel = parent becomes the source
        onBranchFromThread?.(parentThread.id, action, selectedText, sourceMessageId, customQuery);
    }, [onBranchFromThread, parentThread.id]);

    // Right panel (active/child thread) handlers
    const handleRightSend = useCallback((content: string) => {
        onSendToThread?.(activeThread.id, content);
    }, [onSendToThread, activeThread.id]);

    const handleRightBranchAction = useCallback((
        action: BranchAction,
        selectedText: string,
        sourceMessageId?: string,
        customQuery?: string
    ) => {
        // Branch from RIGHT panel = active thread becomes the source
        onBranchFromThread?.(activeThread.id, action, selectedText, sourceMessageId, customQuery);
    }, [onBranchFromThread, activeThread.id]);

    // Mobile View - Tab-based layout
    if (isMobileView) {
        return (
            <div className="flex flex-col h-full">
                {/* Mobile Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <button
                        onClick={() => setMobileActiveTab("parent")}
                        className={cn(
                            "flex-1 py-3 px-4 text-sm font-medium transition-colors",
                            mobileActiveTab === "parent"
                                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-slate-900"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <span className="truncate">{parentThread.title}</span>
                        <span className="ml-1 text-xs text-slate-400">Parent</span>
                    </button>
                    <button
                        onClick={() => setMobileActiveTab("child")}
                        className={cn(
                            "flex-1 py-3 px-4 text-sm font-medium transition-colors",
                            mobileActiveTab === "child"
                                ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500 bg-white dark:bg-slate-900"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <span className="truncate">{activeThread.title}</span>
                        <span className="ml-1 text-xs text-slate-400">Current</span>
                    </button>
                </div>

                {/* Mobile Content */}
                <div className="flex-1 min-h-0">
                    {mobileActiveTab === "parent" ? (
                        <ThreadColumn
                            thread={parentThread}
                            isActive={true}
                            isReference={false}
                            onBranchAction={handleLeftBranchAction}
                            onQuoteAction={onQuoteAction}
                            onSend={handleLeftSend}
                            isLoading={false}
                        />
                    ) : (
                        <ThreadColumn
                            thread={activeThread}
                            isActive={true}
                            onBranchAction={handleRightBranchAction}
                            onQuoteAction={onQuoteAction}
                            onSend={handleRightSend}
                            isLoading={isLoading}
                        />
                    )}
                </div>
            </div>
        );
    }

    // Desktop Split View
    return (
        <div className="flex h-full">
            {/* Left Panel (Parent Thread) */}
            <div
                onClick={() => handlePanelClick("left")}
                className={cn(
                    "relative flex flex-col min-w-[320px] transition-all duration-500 ease-in-out",
                    getLeftWidth(),
                    // Visual styling based on focus state
                    isLeftActive
                        ? "bg-background shadow-lg z-10"
                        : "bg-muted/30 border-r border-slate-200 dark:border-slate-700",
                    // Add inactive class for CSS-based responsive styling
                    !isLeftActive && "split-panel-inactive"
                )}
            >
                {/* Focus indicator */}
                {isLeftActive && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                )}

                <ThreadColumn
                    thread={parentThread}
                    isActive={isLeftActive}
                    isReference={!isLeftActive}
                    onBranchAction={isLeftActive ? handleLeftBranchAction : undefined}
                    onQuoteAction={isLeftActive ? onQuoteAction : undefined}
                    onSend={isLeftActive ? handleLeftSend : undefined}
                    isLoading={false}
                />

                {/* Expand hint for inactive panel */}
                {!isLeftActive && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                            <ChevronRight className="size-3" />
                            Click to focus
                        </div>
                    </div>
                )}
            </div>

            {/* Divider with drag handle appearance */}
            <div className="w-px bg-slate-200 dark:bg-slate-700 relative group cursor-col-resize">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-slate-300 dark:bg-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Right Panel (Active Thread / Child) */}
            <div
                onClick={() => handlePanelClick("right")}
                className={cn(
                    "relative flex flex-col min-w-[320px] transition-all duration-500 ease-in-out",
                    getRightWidth(),
                    // Visual styling based on focus state
                    isRightActive
                        ? "bg-background shadow-lg z-10"
                        : "bg-muted/30 border-l border-slate-200 dark:border-slate-700",
                    // Add inactive class for CSS-based responsive styling
                    !isRightActive && "split-panel-inactive"
                )}
            >
                {/* Focus indicator */}
                {isRightActive && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
                )}

                <ThreadColumn
                    thread={activeThread}
                    isActive={isRightActive}
                    isReference={!isRightActive}
                    onBranchAction={isRightActive ? handleRightBranchAction : undefined}
                    onQuoteAction={isRightActive ? onQuoteAction : undefined}
                    onSend={isRightActive ? handleRightSend : undefined}
                    isLoading={isRightActive ? isLoading : false}
                />

                {/* Expand hint for inactive panel */}
                {!isRightActive && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                            <ChevronLeft className="size-3" />
                            Click to focus
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
