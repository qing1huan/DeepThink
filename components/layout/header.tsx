"use client";

import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { LayoutGrid, MessageSquare, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "chat" | "graph";

interface HeaderProps {
  sessionId?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function Header({ 
  sessionId = "Canvas",
  viewMode = "chat",
  onViewModeChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-14 px-6 bg-white/80 backdrop-blur-sm border-b border-slate-200 dark:bg-slate-900/80 dark:border-slate-700">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Brain className="size-3.5 text-white" />
              </div>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                DeepThink
              </span>
            </div>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-slate-400" />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-slate-600 dark:text-slate-400">
              {viewMode === "graph" ? "Canvas" : "Chat"}
            </BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="text-slate-400" />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-slate-900 font-medium dark:text-slate-100">
              {sessionId}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Mode Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange?.("chat")}
          className={cn(
            "gap-2 h-8 px-3 rounded-md transition-all",
            viewMode === "chat"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <MessageSquare className="size-4" />
          <span className="hidden sm:inline text-sm font-medium">Chat</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange?.("graph")}
          className={cn(
            "gap-2 h-8 px-3 rounded-md transition-all",
            viewMode === "graph"
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <LayoutGrid className="size-4" />
          <span className="hidden sm:inline text-sm font-medium">Canvas</span>
        </Button>
      </div>
    </header>
  );
}
