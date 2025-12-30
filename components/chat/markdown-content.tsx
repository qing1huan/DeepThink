"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { CodeBlock } from "./code-block";

// Import KaTeX CSS for math formula rendering
import "katex/dist/katex.min.css";

interface MarkdownContentProps {
  content: string;
  className?: string;
  variant?: "default" | "user" | "compact";
}

/**
 * Preprocess LaTeX delimiters to be compatible with remark-math
 * DeepSeek uses \[...\] (block) and \(...\) (inline)
 * remark-math expects $$...$$ (block) and $...$ (inline)
 */
function preprocessLaTeX(content: string): string {
  // Replace block math \[...\] with $$...$$
  // Use a regex that handles multiline content
  let processed = content.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`);

  // Replace inline math \(...\) with $...$
  // Be careful not to match escaped parentheses in regular text
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);

  return processed;
}

/**
 * Extract text content from React children (handles nested elements)
 */
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }
  if (typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (children && typeof children === 'object' && 'props' in children) {
    const element = children as React.ReactElement<{ children?: React.ReactNode }>;
    return extractTextFromChildren(element.props.children);
  }
  return '';
}

function MarkdownContentComponent({
  content,
  className,
  variant = "default"
}: MarkdownContentProps) {
  // Preprocess content to convert LaTeX delimiters
  const processedContent = preprocessLaTeX(content);

  return (
    <div
      className={cn(
        "markdown-content prose prose-slate dark:prose-invert prose-sm max-w-none",
        // Custom prose overrides
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-p:leading-relaxed",
        "prose-a:text-indigo-600 dark:prose-a:text-indigo-400",
        "prose-strong:font-semibold",
        variant === "user" && "markdown-user prose-invert",
        variant === "compact" && "markdown-compact",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
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

          // Code - inline code stays here, block code handled in pre
          code: ({ className: codeClassName, children, ...props }) => {
            // Extract language from className
            const languageMatch = /language-(\w+)/.exec(codeClassName || "");

            // If it has a language class, it's a code block - just render code, pre will wrap with CodeBlock
            if (languageMatch) {
              return (
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              );
            }

            // Inline code
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
          },

          // Pre - wrap code blocks with CodeBlock component
          pre: ({ children }) => {
            // children is the <code> element
            const codeElement = children as React.ReactElement<{
              className?: string;
              children?: React.ReactNode;
            }>;

            if (!codeElement || typeof codeElement !== 'object' || !('props' in codeElement)) {
              return <pre>{children}</pre>;
            }

            // Get language from code element's className
            const codeClassName = codeElement.props?.className || "";
            const languageMatch = /language-(\w+)/.exec(codeClassName);
            const language = languageMatch ? languageMatch[1] : "text";

            // Extract text content - since we removed rehype-highlight, children should be string
            const codeContent = extractTextFromChildren(codeElement.props?.children);

            return (
              <CodeBlock language={language}>
                {codeContent.replace(/\n$/, "")}
              </CodeBlock>
            );
          },

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
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownContent = memo(MarkdownContentComponent);
