"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, MessageSquare, GitBranch, Sparkles, ArrowRight, Map } from "lucide-react";
import { formatQuoteForInput, BRANCH_PROMPTS, BranchAction, ThreadColumn, SplitChatLayout } from "@/components/chat";
import { CanvasView } from "@/components/graph";
import { useViewMode } from "@/components/layout";
import { useCanvas } from "@/contexts/canvas-context";


function WelcomeView({ onStartCanvas }: { onStartCanvas: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8 bg-gradient-to-b from-background to-muted/30">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-6 shadow-lg shadow-indigo-500/25">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
          Welcome to DeepThink Canvas
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Explore conversations as visual threads. Branch, explore, and visualize
          Chain of Thought reasoning in a powerful canvas interface.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Thread Nodes</CardTitle>
            <CardDescription>
              Each node is a complete conversation. Click to activate and continue chatting.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-2">
              <GitBranch className="w-5 h-5 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Branch & Explore</CardTitle>
            <CardDescription>
              Create branches from any AI response to explore alternative paths.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <CardTitle className="text-lg">R1 Thoughts</CardTitle>
            <CardDescription>
              See AI reasoning with expandable Chain of Thought blocks.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* CTA */}
      <Button
        size="lg"
        onClick={onStartCanvas}
        className="gap-2 shadow-lg shadow-primary/25"
      >
        <Sparkles className="w-4 h-4" />
        Enter Canvas Mode
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function ChatModeView() {
  const { threads, activeThreadId, isLoading, sendMessage, getParentThread, navigateToThread, setInputDraft, createBranchWithQuery, setActiveThread } = useCanvas();
  const { setViewMode } = useViewMode();
  const activeThread = threads.get(activeThreadId);
  const parentThread = getParentThread(activeThreadId);

  // Determine if we're in split mode (has parent thread)
  const isSplitMode = !!parentThread;

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  const handleOpenCanvas = useCallback(() => {
    setViewMode("graph");
  }, [setViewMode]);

  // Handle sending to a SPECIFIC thread (for split mode)
  // This switches to the target thread first, then sends the message
  const handleSendToThread = useCallback(async (threadId: string, content: string) => {
    // Switch to the target thread first
    setActiveThread(threadId);
    // Then send the message (sendMessage uses activeThreadId internally)
    // Note: We use setTimeout to ensure state update propagates
    setTimeout(async () => {
      await sendMessage(content);
    }, 0);
  }, [setActiveThread, sendMessage]);

  // Handle branch with EXPLICIT source thread ID
  const handleBranchFromThread = useCallback(async (
    sourceThreadId: string,
    action: BranchAction,
    selectedText: string,
    sourceMessageId?: string,
    customQuery?: string
  ) => {
    // Determine the query based on action type
    let query: string;
    if (action === "custom" && customQuery) {
      query = customQuery;
    } else {
      query = BRANCH_PROMPTS[action as keyof typeof BRANCH_PROMPTS] || "";
    }

    // Create branch with the EXPLICIT source thread ID as parent
    await createBranchWithQuery(
      sourceThreadId,  // Use the explicit source thread, not global activeThreadId
      sourceMessageId || "",
      query,
      selectedText
    );
  }, [createBranchWithQuery]);

  // Handle branch actions (for single column mode) - uses activeThreadId
  const handleBranchAction = useCallback(async (
    action: BranchAction,
    selectedText: string,
    sourceMessageId?: string,
    customQuery?: string
  ) => {
    await handleBranchFromThread(activeThreadId, action, selectedText, sourceMessageId, customQuery);
  }, [activeThreadId, handleBranchFromThread]);

  // Handle quote action - fills current input
  const handleQuoteAction = useCallback((selectedText: string) => {
    const formattedQuote = formatQuoteForInput(selectedText);
    setInputDraft(formattedQuote);
  }, [setInputDraft]);

  // Common header component
  const Header = () => (
    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Thread Info */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center">
              {activeThread?.parentId ? (
                <GitBranch className="size-3.5 text-indigo-600" />
              ) : (
                <MessageSquare className="size-3.5 text-indigo-600" />
              )}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {activeThread?.title || "Main Thread"}
            </span>
            {activeThread?.parentId && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                Branch
              </span>
            )}
          </div>
        </div>

        {/* Open Canvas Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenCanvas}
          className="h-7 px-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        >
          <Map className="size-3.5 mr-1.5" />
          <span className="text-xs">View Canvas</span>
        </Button>
      </div>
    </div>
  );

  // Single node mode: centered layout
  if (!isSplitMode) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex h-full">
          <div className="w-full max-w-4xl mx-auto transition-all duration-500 ease-in-out">
            {activeThread && (
              <ThreadColumn
                thread={activeThread}
                isActive={true}
                onBranchAction={handleBranchAction}
                onQuoteAction={handleQuoteAction}
                onSend={handleSend}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Split mode: Focus-driven layout with SplitChatLayout
  if (!activeThread) return null;

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 min-h-0">
        <SplitChatLayout
          parentThread={parentThread}
          activeThread={activeThread}
          isLoading={isLoading}
          onSendToThread={handleSendToThread}
          onBranchFromThread={handleBranchFromThread}
          onQuoteAction={handleQuoteAction}
        />
      </div>
    </div>
  );
}

export default function Home() {
  const { viewMode, setViewMode } = useViewMode();
  const { threads } = useCanvas();
  const [hasStarted, setHasStarted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Check if we have any user messages (beyond the initial welcome)
  const hasUserMessages = Array.from(threads.values()).some(
    thread => thread.messages.some(m => m.role === "user")
  );

  // Handle hydration - must check on client side only
  useEffect(() => {
    setIsHydrated(true);
    // If user has messages, skip the welcome screen
    if (hasUserMessages) {
      setHasStarted(true);
    }
  }, [hasUserMessages]);

  const handleStartCanvas = () => {
    setHasStarted(true);
    setViewMode("graph");
  };

  // During SSR or before hydration, show a loading state to prevent mismatch
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show welcome view if user hasn't started yet
  if (!hasStarted && !hasUserMessages) {
    return <WelcomeView onStartCanvas={handleStartCanvas} />;
  }

  // Render based on view mode
  return viewMode === "chat" ? <ChatModeView /> : <CanvasView />;
}
