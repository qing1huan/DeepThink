"use client";

import { useMemo, useCallback } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/contexts/canvas-context";
import { ThreadNode } from "@/types/canvas";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BreadcrumbNode {
    id: string;
    title: string;
}

interface ThreadBreadcrumbsProps {
    className?: string;
}

export function ThreadBreadcrumbs({ className }: ThreadBreadcrumbsProps) {
    const { threads, activeThreadId, navigateToThread } = useCanvas();

    // Build the ancestor chain from current thread to root
    const breadcrumbPath = useMemo((): BreadcrumbNode[] => {
        const path: BreadcrumbNode[] = [];
        let currentId: string | null = activeThreadId;

        while (currentId) {
            const thread = threads.get(currentId);
            if (!thread) break;

            path.unshift({
                id: thread.id,
                title: thread.title || "Untitled",
            });

            currentId = thread.parentId;
        }

        return path;
    }, [threads, activeThreadId]);

    // Handle navigation to a specific thread
    const handleNavigate = useCallback((threadId: string) => {
        navigateToThread(threadId);
    }, [navigateToThread]);

    // If no path or only root, don't show breadcrumbs
    if (breadcrumbPath.length <= 1) {
        return null;
    }

    // Smart collapsing: show Root > ... > Grandparent > Parent > Current when depth > 4
    const MAX_VISIBLE = 4;
    const shouldCollapse = breadcrumbPath.length > MAX_VISIBLE;

    // Calculate visible items
    const visibleItems = useMemo(() => {
        if (!shouldCollapse) {
            return breadcrumbPath;
        }

        // Show: first item (root), ..., last 3 items
        const root = breadcrumbPath[0];
        const lastThree = breadcrumbPath.slice(-3);

        return [root, null, ...lastThree]; // null represents ellipsis
    }, [breadcrumbPath, shouldCollapse]);

    // Hidden middle items for dropdown
    const hiddenItems = useMemo(() => {
        if (!shouldCollapse) return [];
        // Everything except first and last 3
        return breadcrumbPath.slice(1, -3);
    }, [breadcrumbPath, shouldCollapse]);

    return (
        <Breadcrumb className={cn("px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800", className)}>
            <BreadcrumbList>
                {visibleItems.map((item, index) => {
                    // Ellipsis with dropdown
                    if (item === null) {
                        return (
                            <BreadcrumbItem key="ellipsis">
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                        <MoreHorizontal className="size-4 text-slate-500" />
                                        <span className="sr-only">展开隐藏路径</span>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="min-w-[160px]">
                                        {hiddenItems.map((hiddenItem) => (
                                            <DropdownMenuItem
                                                key={hiddenItem.id}
                                                onClick={() => handleNavigate(hiddenItem.id)}
                                                className="cursor-pointer"
                                            >
                                                <span className="truncate max-w-[200px]">{hiddenItem.title}</span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <BreadcrumbSeparator>
                                    <ChevronRight className="size-3.5 text-slate-400" />
                                </BreadcrumbSeparator>
                            </BreadcrumbItem>
                        );
                    }

                    const isLast = index === visibleItems.length - 1;
                    const isFirst = index === 0;

                    return (
                        <BreadcrumbItem key={item.id}>
                            {isLast ? (
                                // Current node: highlighted, not clickable
                                <BreadcrumbPage className="font-semibold text-slate-900 dark:text-slate-100">
                                    <span className="truncate max-w-[150px] block">{item.title}</span>
                                </BreadcrumbPage>
                            ) : (
                                // Historical node: clickable
                                <BreadcrumbLink
                                    onClick={() => handleNavigate(item.id)}
                                    className={cn(
                                        "cursor-pointer text-slate-500 dark:text-slate-400",
                                        "hover:text-indigo-600 dark:hover:text-indigo-400",
                                        "transition-colors truncate max-w-[120px] block"
                                    )}
                                >
                                    {isFirst && <span className="text-xs mr-1">🌳</span>}
                                    {item.title}
                                </BreadcrumbLink>
                            )}
                            {!isLast && (
                                <BreadcrumbSeparator>
                                    <ChevronRight className="size-3.5 text-slate-400" />
                                </BreadcrumbSeparator>
                            )}
                        </BreadcrumbItem>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
