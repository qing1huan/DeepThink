"use client";

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Search, Lightbulb, MessageCircle, Quote, GitBranch, X } from "lucide-react";

interface SelectionMenuProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onBranchAction: (action: BranchAction, selectedText: string, sourceMessageId?: string, customQuery?: string) => void;
  onQuoteAction: (selectedText: string) => void;
}

export type BranchAction = "explain" | "example" | "custom";

interface MenuPosition {
  x: number;
  y: number;
  visible: boolean;
  flipBelow?: boolean; // True when menu should appear below selection (near viewport top)
}

interface SelectionState {
  text: string;
  messageId?: string;
}

// Predefined prompts for branch actions
const BRANCH_PROMPTS = {
  explain: "请解释这段内容：",
  example: "请举例说明这一点：",
};

export function SelectionMenu({ containerRef, onBranchAction, onQuoteAction }: SelectionMenuProps) {
  const [position, setPosition] = useState<MenuPosition>({ x: 0, y: 0, visible: false });
  const [selection, setSelection] = useState<SelectionState>({ text: "" });
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);
  const isSelectingRef = useRef(false);
  // Lock to prevent menu from closing when switching to custom input mode
  const isInputModeRef = useRef(false);

  // Get the message ID from the selection's ancestor
  const getMessageIdFromSelection = useCallback((range: Range): string | undefined => {
    let node: Node | null = range.commonAncestorContainer;

    while (node && node !== containerRef.current) {
      if (node instanceof HTMLElement) {
        const messageId = node.dataset.messageId;
        if (messageId) return messageId;
      }
      node = node.parentNode;
    }
    return undefined;
  }, [containerRef]);

  // Handle selection change
  const handleSelectionChange = useCallback(() => {
    // Don't hide menu if we're in input mode (user clicked Custom button)
    if (isInputModeRef.current) return;

    const windowSelection = window.getSelection();

    if (!windowSelection || windowSelection.isCollapsed || windowSelection.rangeCount === 0) {
      if (!isSelectingRef.current && !showCustomInput) {
        setTimeout(() => {
          // Double-check the lock before hiding
          if (isInputModeRef.current) return;
          setPosition(prev => ({ ...prev, visible: false }));
          setShowCustomInput(false);
          setCustomQuery("");
        }, 150);
      }
      return;
    }

    const selectedText = windowSelection.toString().trim();
    if (!selectedText || selectedText.length < 3) {
      if (!showCustomInput) {
        setPosition(prev => ({ ...prev, visible: false }));
      }
      return;
    }

    const range = windowSelection.getRangeAt(0);

    if (!containerRef.current?.contains(range.commonAncestorContainer)) {
      if (!showCustomInput) {
        setPosition(prev => ({ ...prev, visible: false }));
      }
      return;
    }

    // Use viewport coordinates directly for fixed positioning
    const rect = range.getBoundingClientRect();

    const menuHeight = 45; // Approximate menu height + spacing
    const verticalGap = 8; // Small gap between selection and menu

    // Center horizontally on the selection
    const x = rect.left + (rect.width / 2);

    // Position above selection by default, flip below if near top of viewport
    let y: number;
    let flipBelow = false;

    if (rect.top - menuHeight - verticalGap < 10) {
      // Too close to top, show below the selection
      y = rect.bottom + verticalGap;
      flipBelow = true;
    } else {
      // Show above the selection
      y = rect.top - verticalGap;
    }

    const messageId = getMessageIdFromSelection(range);

    setPosition({
      x,
      y,
      visible: true,
      flipBelow,
    });

    setSelection({
      text: selectedText,
      messageId,
    });
  }, [containerRef, getMessageIdFromSelection, showCustomInput]);

  // Handle mouse events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = () => {
      isSelectingRef.current = true;
    };

    const handleMouseUp = () => {
      isSelectingRef.current = false;
      setTimeout(handleSelectionChange, 10);
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if we're in input mode and click is inside the menu
      if (isInputModeRef.current && menuRef.current?.contains(e.target as Node)) {
        return;
      }

      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setTimeout(() => {
          // Double-check the lock before hiding
          if (isInputModeRef.current) return;
          window.getSelection()?.removeAllRanges();
          setPosition(prev => ({ ...prev, visible: false }));
          setShowCustomInput(false);
          setCustomQuery("");
        }, 100);
      }
    };

    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [containerRef, handleSelectionChange]);

  // Focus custom input when shown
  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  // Handle branch action (creates new node)
  const handleBranchClick = useCallback((action: BranchAction) => {
    if (!selection.text) return;

    if (action === "custom") {
      // Lock the menu open BEFORE changing state to prevent focus-loss from closing it
      isInputModeRef.current = true;
      setShowCustomInput(true);
      return;
    }

    onBranchAction(action, selection.text, selection.messageId);
    window.getSelection()?.removeAllRanges();
    setPosition(prev => ({ ...prev, visible: false }));
  }, [selection, onBranchAction]);

  // Handle custom query submit
  const handleCustomSubmit = useCallback(() => {
    if (!selection.text || !customQuery.trim()) return;

    // Release the lock before closing
    isInputModeRef.current = false;
    onBranchAction("custom", selection.text, selection.messageId, customQuery.trim());
    window.getSelection()?.removeAllRanges();
    setPosition(prev => ({ ...prev, visible: false }));
    setShowCustomInput(false);
    setCustomQuery("");
  }, [selection, customQuery, onBranchAction]);

  const handleCustomKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCustomSubmit();
    } else if (e.key === "Escape") {
      // Release the lock when canceling with Escape
      isInputModeRef.current = false;
      setShowCustomInput(false);
      setCustomQuery("");
    }
  }, [handleCustomSubmit]);

  // Handle quote action (fills input)
  const handleQuoteClick = useCallback(() => {
    if (!selection.text) return;

    onQuoteAction(selection.text);
    window.getSelection()?.removeAllRanges();
    setPosition(prev => ({ ...prev, visible: false }));
  }, [selection, onQuoteAction]);

  // Cancel custom input
  const handleCancelCustom = useCallback(() => {
    // Release the lock when canceling
    isInputModeRef.current = false;
    setShowCustomInput(false);
    setCustomQuery("");
  }, []);

  if (!position.visible) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-50 pointer-events-auto",
        "animate-in fade-in-0 zoom-in-95 duration-150"
      )}
      style={{
        left: position.x,
        top: position.y,
        // Center horizontally, position above or below based on flipBelow
        transform: position.flipBelow
          ? "translateX(-50%)"
          : "translate(-50%, -100%)",
      }}
    >
      <div
        className={cn(
          "flex items-center gap-0.5 px-1.5 py-1",
          "bg-slate-900 dark:bg-slate-800",
          "rounded-xl shadow-2xl",
          "border border-slate-700"
        )}
      >
        {showCustomInput ? (
          /* Custom Input Mode */
          <div className="flex items-center gap-2 px-1">
            <GitBranch className="size-3.5 text-purple-400 flex-shrink-0" />
            <input
              ref={customInputRef}
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder="输入你的问题..."
              className={cn(
                "w-48 bg-transparent border-none outline-none",
                "text-sm text-white placeholder:text-slate-500",
                "py-1"
              )}
            />
            <button
              onClick={handleCustomSubmit}
              disabled={!customQuery.trim()}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium",
                "bg-purple-600 hover:bg-purple-500 text-white",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors"
              )}
            >
              分支
            </button>
            <button
              onClick={handleCancelCustom}
              className="p-1 text-slate-400 hover:text-white transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          /* Action Buttons Mode */
          <>
            {/* Branch Actions Group */}
            <div className="flex items-center">
              <button
                onClick={() => handleBranchClick("explain")}
                title="解释 (创建分支)"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
                  "text-xs font-medium",
                  "text-purple-300 hover:text-purple-100",
                  "hover:bg-purple-600/30",
                  "transition-colors duration-150"
                )}
              >
                <Search className="size-3.5" />
                <span className="hidden sm:inline">解释</span>
              </button>

              <button
                onClick={() => handleBranchClick("example")}
                title="举例 (创建分支)"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
                  "text-xs font-medium",
                  "text-purple-300 hover:text-purple-100",
                  "hover:bg-purple-600/30",
                  "transition-colors duration-150"
                )}
              >
                <Lightbulb className="size-3.5" />
                <span className="hidden sm:inline">举例</span>
              </button>

              <button
                onClick={() => handleBranchClick("custom")}
                title="自定义 (创建分支)"
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
                  "text-xs font-medium",
                  "text-purple-300 hover:text-purple-100",
                  "hover:bg-purple-600/30",
                  "transition-colors duration-150"
                )}
              >
                <MessageCircle className="size-3.5" />
                <span className="hidden sm:inline">自定义</span>
              </button>
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-slate-600 mx-1" />

            {/* Quote Action (Current Thread) */}
            <button
              onClick={handleQuoteClick}
              title="引用 (当前线程)"
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg",
                "text-xs font-medium",
                "text-slate-300 hover:text-white",
                "hover:bg-slate-700/60",
                "transition-colors duration-150"
              )}
            >
              <Quote className="size-3.5" />
              <span className="hidden sm:inline">引用</span>
            </button>
          </>
        )}
      </div>

      {/* Arrow pointing down */}
      {!showCustomInput && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 -bottom-1.5",
            "w-0 h-0",
            "border-l-[6px] border-l-transparent",
            "border-r-[6px] border-r-transparent",
            "border-t-[6px] border-t-slate-900 dark:border-t-slate-800"
          )}
        />
      )}
    </div>
  );
}

/**
 * Format selected text as a markdown quote
 */
export function formatQuoteForInput(selectedText: string): string {
  const cleanedText = selectedText.replace(/\n/g, "\n> ");
  return `> ${cleanedText}\n\n`;
}

// Export predefined prompts for external use
export { BRANCH_PROMPTS };
