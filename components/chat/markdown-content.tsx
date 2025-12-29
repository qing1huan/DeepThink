"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { memo } from "react";

interface MarkdownContentProps {
  content: string;
  className?: string;
  variant?: "default" | "user" | "compact";
}

function MarkdownContentComponent({
  content,
  className,
  variant = "default"
}: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "markdown-content",
        variant === "user" && "markdown-user",
        variant === "compact" && "markdown-compact",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mt-3 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-3 mb-1 first:mt-0">{children}</h3>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-1 ml-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1 ml-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),

          // Code
          code: ({ className: codeClassName, children, ...props }) => {
            const isInline = !codeClassName;

            if (isInline) {
              return (
                <code
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[13px] font-mono",
                    variant === "user"
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className={cn(codeClassName, "text-[13px]")} {...props}>
                {children}
              </code>
            );
          },

          // Code blocks
          pre: ({ children }) => (
            <pre className={cn(
              "my-2 p-3 rounded-lg overflow-x-auto text-[13px]",
              variant === "user"
                ? "bg-black/20"
                : "bg-slate-900 dark:bg-slate-950"
            )}>
              {children}
            </pre>
          ),

          // Blockquotes - styled as hint/note blocks
          blockquote: ({ children }) => (
            <blockquote className={cn(
              "border-l-4 pl-4 pr-3 py-2 my-3 rounded-r-lg",
              variant === "user"
                ? "border-white/50 bg-white/10 text-white/90"
                : "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-slate-700 dark:text-slate-300"
            )}>
              {children}
            </blockquote>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "underline underline-offset-2 hover:no-underline",
                variant === "user"
                  ? "text-white/90 hover:text-white"
                  : "text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              )}
            >
              {children}
            </a>
          ),

          // Strong & Emphasis
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),

          // Horizontal Rule
          hr: () => (
            <hr className={cn(
              "my-3 border-t",
              variant === "user"
                ? "border-white/20"
                : "border-slate-200 dark:border-slate-700"
            )} />
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className={cn(
              variant === "user"
                ? "bg-white/10"
                : "bg-slate-100 dark:bg-slate-800"
            )}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-semibold border-b border-slate-200 dark:border-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownContent = memo(MarkdownContentComponent);
