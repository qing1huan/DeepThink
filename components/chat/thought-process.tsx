"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThoughtProcessProps {
  thoughts: string;
  className?: string;
}

export function ThoughtProcess({ thoughts, className }: ThoughtProcessProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!thoughts) return null;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("mb-3", className)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2 h-8 px-3 text-xs font-medium rounded-full",
            "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 hover:text-amber-800",
            "dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25 dark:hover:text-amber-300",
            "transition-all duration-200"
          )}
        >
          <Brain className="size-3.5" />
          <span>思考过程</span>
          {isOpen ? (
            <ChevronDown className="size-3.5 ml-1" />
          ) : (
            <ChevronRight className="size-3.5 ml-1" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 animate-in slide-in-from-top-2 duration-200">
        <div
          className={cn(
            "p-4 rounded-lg border",
            "bg-slate-50 border-slate-200/80",
            "dark:bg-slate-900/50 dark:border-slate-700/50"
          )}
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
            <Brain className="size-4 text-amber-600 dark:text-amber-500" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              Chain of Thought
            </span>
          </div>
          <pre
            className={cn(
              "whitespace-pre-wrap font-mono text-sm leading-relaxed",
              "text-slate-700 dark:text-slate-300",
              "max-h-64 overflow-y-auto scrollbar-thin"
            )}
          >
            {thoughts}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

