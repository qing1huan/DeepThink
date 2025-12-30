"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
    language?: string;
    children: string;
    className?: string;
}

export function CodeBlock({ language, children, className }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }, [children]);

    // Normalize language name for display
    const displayLanguage = language?.replace(/^language-/, "") || "text";

    return (
        <div
            className={cn(
                "my-3 rounded-lg overflow-hidden",
                "border border-[#3d3d3d]",
                "shadow-lg",
                className
            )}
        >
            {/* Header Bar - Clean style */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#2d2d2d]">
                {/* Language Label */}
                <span className="text-xs font-medium text-[#8b8b8b] uppercase tracking-wider">
                    {displayLanguage}
                </span>

                {/* Copy Button */}
                <button
                    onClick={handleCopy}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200",
                        "hover:bg-[#3d3d3d]",
                        copied
                            ? "text-emerald-400"
                            : "text-[#8b8b8b] hover:text-white"
                    )}
                    aria-label={copied ? "Copied" : "Copy code"}
                >
                    {copied ? (
                        <>
                            <Check className="size-3.5" />
                            <span>Copied!</span>
                        </>
                    ) : (
                        <>
                            <Copy className="size-3.5" />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Code Content */}
            <pre
                className={cn(
                    "p-4 overflow-x-auto bg-[#1e1e1e]",
                    // Custom scrollbar styling
                    "[&::-webkit-scrollbar]:h-2",
                    "[&::-webkit-scrollbar-track]:bg-transparent",
                    "[&::-webkit-scrollbar-thumb]:bg-[#3d3d3d]",
                    "[&::-webkit-scrollbar-thumb]:rounded-full",
                    "[&::-webkit-scrollbar-thumb:hover]:bg-[#4d4d4d]"
                )}
            >
                <code
                    className={cn(
                        "font-mono text-[#d4d4d4]",
                        "text-[13.5px] leading-relaxed"
                    )}
                >
                    {children}
                </code>
            </pre>
        </div>
    );
}
