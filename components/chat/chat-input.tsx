"use client";

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, Square } from "lucide-react";
import { useCanvas } from "@/contexts/canvas-context";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "请输入消息... (Enter 发送，Shift+Enter 换行)",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { inputDraft, clearInputDraft, isLoading, stopGeneration } = useCanvas();

  // Watch for inputDraft changes and inject into textarea
  useEffect(() => {
    if (inputDraft && inputDraft.length > 0) {
      setValue(inputDraft);
      clearInputDraft();

      // Focus the textarea and place cursor at the end
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Use setTimeout to ensure value is set before cursor positioning
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.value.length;
            textareaRef.current.selectionEnd = textareaRef.current.value.length;
          }
        }, 0);
      }
    }
  }, [inputDraft, clearInputDraft]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200); // Max height 200px
      textarea.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleSend = useCallback(() => {
    const trimmedValue = value.trim();
    if (trimmedValue && !disabled) {
      onSend(trimmedValue);
      setValue("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Prevent sending during IME composition (e.g., Chinese input)
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sticky bottom-0 w-full bg-gradient-to-t from-background via-background to-transparent pt-6 pb-4 px-4">
      <div
        className={cn(
          "flex items-end gap-3 max-w-4xl mx-auto",
          "p-3 rounded-xl",
          "bg-white dark:bg-slate-900",
          "border border-slate-200 dark:border-slate-700",
          "shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50",
          // Focus-within: outer container lights up when textarea is focused
          "focus-within:border-primary focus-within:ring-1 focus-within:ring-ring",
          "transition-all duration-200"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none",
            // Remove all borders, shadows, and focus rings from textarea itself
            "border-0 shadow-none bg-transparent",
            "focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            "text-sm text-slate-800 dark:text-slate-100",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "min-h-[24px] max-h-[200px]",
            "py-1.5 px-1"
          )}
        />

        <Button
          onClick={isLoading ? stopGeneration : handleSend}
          disabled={!isLoading && (disabled || !value.trim())}
          size="icon"
          className={cn(
            "shrink-0 rounded-xl h-10 w-10",
            isLoading
              ? "bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
              : "bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
            "disabled:from-slate-300 disabled:to-slate-400 disabled:opacity-50",
            "transition-all duration-200"
          )}
        >
          {isLoading ? (
            <Square className="size-4" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>

      <p className="text-center text-[10px] text-slate-400 mt-2">
        DeepThink v4.2 · Powered by Chain of Thought reasoning
      </p>
    </div>
  );
}
