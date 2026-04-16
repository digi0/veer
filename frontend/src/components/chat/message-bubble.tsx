"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={cn("group flex w-full mb-5", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[11px] font-bold mr-3 mt-1 shrink-0 tracking-wider">
          V
        </div>
      )}

      <div className={cn("flex flex-col max-w-[75%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-relaxed",
            isUser
              ? "bg-neutral-900 text-white rounded-tr-sm"
              : "bg-white border border-neutral-200 text-neutral-800 rounded-tl-sm shadow-sm"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <ReactMarkdown
              components={{
                h1: ({ children }) => <p className="font-semibold text-sm mb-2 mt-1">{children}</p>,
                h2: ({ children }) => <p className="font-semibold text-sm mb-1 mt-3">{children}</p>,
                h3: ({ children }) => <p className="font-medium text-sm mb-1 mt-2">{children}</p>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 pl-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 pl-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-neutral-900">{children}</strong>,
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 hover:text-blue-700">
                    {children}
                  </a>
                ),
                hr: () => <hr className="my-2 border-neutral-100" />,
              }}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>

        {/* Copy button */}
        {content && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[11px] text-neutral-400 hover:text-neutral-600 opacity-0 group-hover:opacity-100 transition-all"
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}
