"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Brain,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvas } from "@/contexts/canvas-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useViewMode } from "./app-shell";
import { buildThreadTree, ThreadTreeNode } from "@/types/canvas";

// Recursive component to render thread tree
function ThreadItem({
  node,
  activeThreadId,
  onSelect,
  onDelete,
  isCollapsed: sidebarCollapsed,
}: {
  node: ThreadTreeNode;
  activeThreadId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isCollapsed: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isActive = node.thread.id === activeThreadId;
  const isRoot = node.depth === 0;

  const handleClick = useCallback(() => {
    onSelect(node.thread.id);
  }, [onSelect, node.thread.id]);

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  const handleDelete = useCallback(() => {
    onDelete(node.thread.id);
  }, [onDelete, node.thread.id]);

  return (
    <div className="w-full group">
      {/* Thread Item */}
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 text-sm py-2 px-2 rounded cursor-pointer transition-colors",
          "hover:bg-slate-800/40",
          isActive && "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/25",
          !isActive && "text-slate-400"
        )}
        style={{ paddingLeft: sidebarCollapsed ? 8 : 8 + node.depth * 16 }}
      >
        {/* Expand/Collapse for nodes with children */}
        {hasChildren && !sidebarCollapsed && (
          <button
            onClick={toggleExpand}
            className="p-0.5 hover:bg-slate-700 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
        )}

        {/* Icon */}
        {isRoot ? (
          <Brain className={cn("size-3.5 flex-shrink-0", hasChildren && sidebarCollapsed && "ml-0")} />
        ) : (
          <GitBranch className="size-3.5 flex-shrink-0" />
        )}

        {/* Title - only show if not collapsed */}
        {!sidebarCollapsed && (
          <span className="truncate flex-1">{node.thread.title}</span>
        )}

        {/* Message count badge */}
        {!sidebarCollapsed && (
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full",
            isActive ? "bg-indigo-500/30 text-indigo-300" : "bg-slate-700 text-slate-500"
          )}>
            {node.thread.messages.length}
          </span>
        )}

        {/* Delete button with AlertDialog */}
        {!sidebarCollapsed && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
              >
                <Trash2 className="size-3 text-red-400" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-slate-100">删除此会话？</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  此操作将永久删除该会话及其所有消息，无法恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100">
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  确定删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Children - only render if expanded and not collapsed sidebar */}
      {hasChildren && isExpanded && !sidebarCollapsed && (
        <div className="relative">
          {/* Vertical line connecting children */}
          <div
            className="absolute left-[19px] top-0 bottom-2 w-px bg-slate-700/50"
            style={{ left: 11 + node.depth * 16 }}
          />
          {node.children.map((child) => (
            <ThreadItem
              key={child.thread.id}
              node={child}
              activeThreadId={activeThreadId}
              onSelect={onSelect}
              onDelete={onDelete}
              isCollapsed={sidebarCollapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}


export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const {
    sessions,
    activeSessionId,
    threads,
    activeThreadId,
    createSession,
    switchSession,
    deleteSession: deleteSessionAction,
    navigateToThread,
    deleteThread,
    clearAllData
  } = useCanvas();
  const { setViewMode } = useViewMode();

  // Create new session (no longer clears data)
  const handleNewChat = () => {
    createSession();
    setViewMode("chat");
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      clearAllData();
    }
  };

  // Handle session selection
  const handleSelectSession = useCallback((sessionId: string) => {
    switchSession(sessionId);
    setViewMode("chat");
  }, [switchSession, setViewMode]);

  // Handle session deletion
  const handleDeleteSession = useCallback((sessionId: string) => {
    deleteSessionAction(sessionId);
  }, [deleteSessionAction]);

  // Build hierarchical tree from threads
  const threadTree = useMemo(() => {
    return buildThreadTree(threads);
  }, [threads]);

  // Handle thread selection - navigate to chat mode
  const handleSelectThread = useCallback((id: string) => {
    navigateToThread(id);
    setViewMode("chat");
  }, [navigateToThread, setViewMode]);

  // Handle thread deletion
  const handleDeleteThread = useCallback((id: string) => {
    deleteThread(id);
  }, [deleteThread]);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-slate-900 text-slate-50 transition-all duration-300 ease-in-out border-r border-slate-800",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex items-center h-14 px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
            <Brain className="size-5 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <span className="font-semibold text-lg tracking-tight whitespace-nowrap">
                DeepThink
              </span>
              <span className="text-[10px] text-slate-500 ml-1">v4.2</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col py-4 px-2 overflow-y-auto scrollbar-thin">
        <div className="space-y-1">
          <Button
            variant="ghost"
            onClick={handleNewChat}
            className={cn(
              "w-full justify-start gap-3 text-slate-300 hover:text-slate-50 hover:bg-slate-800/60",
              isCollapsed && "justify-center px-2"
            )}
          >
            <Plus className="size-5" />
            {!isCollapsed && <span className="truncate">New Canvas</span>}
          </Button>
        </div>

        <Separator className="my-4 bg-slate-700/50" />

        {/* Session List */}
        {!isCollapsed && sessions.length > 1 && (
          <div className="mb-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Sessions
              </p>
              <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                {sessions.length}
              </span>
            </div>

            <div className="space-y-0.5">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={cn(
                    "group flex items-center gap-2 text-sm py-2 px-2 rounded cursor-pointer transition-colors",
                    "hover:bg-slate-800/40",
                    session.id === activeSessionId && "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/25",
                    session.id !== activeSessionId && "text-slate-400"
                  )}
                >
                  <Brain className="size-3.5 flex-shrink-0" />
                  <span className="truncate flex-1">{session.title}</span>

                  {/* Delete button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                      >
                        <Trash2 className="size-3 text-red-400" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-slate-900 border-slate-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-slate-100">删除此会话？</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                          此操作将永久删除该会话及其所有对话，无法恢复。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100">
                          取消
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSession(session.id)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          确定删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>

            <Separator className="my-4 bg-slate-700/50" />
          </div>
        )}

        {/* Thread Tree */}
        <div className="flex-1">
          {!isCollapsed && (
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Threads
              </p>
              <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                {threads.size}
              </span>
            </div>
          )}

          <div className="space-y-0.5">
            {threadTree.map((node) => (
              <ThreadItem
                key={node.thread.id}
                node={node}
                activeThreadId={activeThreadId}
                onSelect={handleSelectThread}
                onDelete={handleDeleteThread}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>

          {threads.size === 0 && !isCollapsed && (
            <div className="px-2 py-8 text-center">
              <MessageSquare className="size-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-600">No threads yet</p>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="py-4 px-2 border-t border-slate-800">
        <Button
          variant="ghost"
          onClick={handleClearData}
          className={cn(
            "w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10",
            isCollapsed && "justify-center px-2"
          )}
        >
          <Trash2 className="size-5" />
          {!isCollapsed && <span className="truncate">Clear Data</span>}
        </Button>

        <Button
          variant="ghost"
          onClick={() => console.log("Settings")}
          className={cn(
            "w-full justify-start gap-3 text-slate-300 hover:text-slate-50 hover:bg-slate-800/60",
            isCollapsed && "justify-center px-2"
          )}
        >
          <Settings className="size-5" />
          {!isCollapsed && <span className="truncate">Settings</span>}
        </Button>

        <Separator className="my-3 bg-slate-700/50" />

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "w-full justify-center text-slate-400 hover:text-slate-50 hover:bg-slate-800/60"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="size-5" />
          ) : (
            <>
              <ChevronLeft className="size-5" />
              <span className="ml-2">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
