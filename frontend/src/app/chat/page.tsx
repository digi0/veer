"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowUp, RotateCcw, Plus, ChevronLeft, ChevronRight,
  FileText, CreditCard, Car, Info, ShoppingBag, Globe, Layers
} from "lucide-react";
import { MessageBubble } from "@/components/chat/message-bubble";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const SERVICE_LIST = [
  { key: "General",         label: "General",         icon: Layers,    desc: "Any government query" },
  { key: "Aadhaar",         label: "Aadhaar",          icon: CreditCard, desc: "Identity & address updates" },
  { key: "Passport",        label: "Passport",         icon: Globe,     desc: "Travel documents" },
  { key: "PAN Card",        label: "PAN Card",         icon: FileText,  desc: "Tax identification" },
  { key: "Driving License", label: "Driving License",  icon: Car,       desc: "Road & transport" },
  { key: "RTI",             label: "RTI",              icon: Info,      desc: "Right to information" },
  { key: "Ration Card",     label: "Ration Card",      icon: ShoppingBag, desc: "Food & subsidies" },
];

const QUICK_ACTIONS = [
  { label: "Update Aadhaar address",     prompt: "How do I update my Aadhaar address?" },
  { label: "Apply for new passport",     prompt: "How do I apply for a new passport?" },
  { label: "Get a PAN card",             prompt: "How do I apply for a PAN card?" },
  { label: "Obtain a driving license",   prompt: "How do I get a driving license?" },
  { label: "File an RTI application",    prompt: "How do I file an RTI application?" },
  { label: "Apply for ration card",      prompt: "How do I apply for a ration card?" },
];

const SUGGESTIONS: Record<string, string[]> = {
  aadhaar:         ["What documents do I need for Aadhaar update?", "How long does Aadhaar update take?", "Can I update Aadhaar without registered mobile?"],
  passport:        ["What is the fee for a new passport?", "How long does passport processing take?", "What is Tatkal passport?"],
  pan:             ["What is the PAN card fee?", "How long does PAN card delivery take?", "Can I apply for PAN card online?"],
  driving_license: ["What is the fee for a driving license?", "How do I book a driving test?", "What is a learner's license?"],
  rti:             ["What is the RTI application fee?", "How long does RTI response take?", "Can I file RTI online?"],
  ration_card:     ["Who is eligible for a ration card?", "What are the ration card categories?", "How do I check ration card status?"],
};

function detectServiceKey(message: string): string | null {
  const m = message.toLowerCase();
  if (["aadhaar", "aadhar", "uid"].some(w => m.includes(w))) return "aadhaar";
  if (["passport"].some(w => m.includes(w))) return "passport";
  if (["pan card", "pan number"].some(w => m.includes(w))) return "pan";
  if (["driving license", "driving licence", "rto"].some(w => m.includes(w))) return "driving_license";
  if (["rti", "right to information"].some(w => m.includes(w))) return "rti";
  if (["ration card", "ration"].some(w => m.includes(w))) return "ration_card";
  return null;
}

function generateTitle(content: string): string {
  return content.length > 40 ? content.slice(0, 40) + "..." : content;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("English");
  const [activeService, setActiveService] = useState("General");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startNewChat = () => {
    if (messages.length > 0) {
      const conv: Conversation = {
        id: Date.now().toString(),
        title: generateTitle(messages[0].content),
        messages,
        createdAt: new Date(),
      };
      setConversations(prev => [conv, ...prev]);
    }
    setMessages([]);
    setActiveConvId(null);
    setSuggestions([]);
    setInput("");
  };

  const loadConversation = (conv: Conversation) => {
    if (messages.length > 0 && activeConvId !== conv.id) {
      const current: Conversation = {
        id: activeConvId || Date.now().toString(),
        title: generateTitle(messages[0].content),
        messages,
        createdAt: new Date(),
      };
      setConversations(prev => {
        const exists = prev.find(c => c.id === current.id);
        return exists ? prev.map(c => c.id === current.id ? current : c) : [current, ...prev];
      });
    }
    setMessages(conv.messages);
    setActiveConvId(conv.id);
    setSuggestions([]);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    setSuggestions([]);
    const userMessage: Message = { role: "user", content: content.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, language }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: accumulated };
          return updated;
        });
      }

      // Show follow-up suggestions
      const serviceKey = detectServiceKey(content);
      if (serviceKey && SUGGESTIONS[serviceKey]) {
        setSuggestions(SUGGESTIONS[serviceKey]);
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const activeServiceData = SERVICE_LIST.find(s => s.key === activeService) || SERVICE_LIST[0];

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">

      {/* Sidebar */}
      <aside className={cn(
        "shrink-0 bg-[#0D1117] flex flex-col h-full transition-all duration-300 border-r border-neutral-800",
        sidebarOpen ? "w-60" : "w-14"
      )}>
        {/* Logo + toggle */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-neutral-800">
          {sidebarOpen && (
            <Link href="/" className="block">
              <div className="text-base font-bold tracking-widest text-white">
                <span className="text-[#FF9933]">V</span>EER
              </div>
              <div className="text-[9px] text-neutral-600 tracking-wider uppercase mt-0.5">Gov Services AI</div>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(p => !p)}
            className="ml-auto text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* New chat */}
        <div className="px-3 py-3 border-b border-neutral-800">
          <button
            onClick={startNewChat}
            className={cn(
              "flex items-center gap-2 w-full rounded-lg py-2 px-2 text-xs font-medium text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors",
              !sidebarOpen && "justify-center"
            )}
          >
            <Plus size={14} />
            {sidebarOpen && "New chat"}
          </button>
        </div>

        {/* Services */}
        <div className="px-3 py-3 border-b border-neutral-800 overflow-y-auto">
          {sidebarOpen && (
            <p className="text-[9px] text-neutral-600 uppercase tracking-widest mb-2 px-1">Services</p>
          )}
          <div className="flex flex-col gap-0.5">
            {SERVICE_LIST.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveService(key)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg py-2 px-2 text-xs font-medium transition-colors",
                  !sidebarOpen && "justify-center",
                  activeService === key
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300"
                )}
                title={!sidebarOpen ? label : undefined}
              >
                <Icon size={14} className={activeService === key ? "text-[#FF9933]" : ""} />
                {sidebarOpen && label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        {sidebarOpen && (
          <div className="px-3 py-3 border-b border-neutral-800">
            <p className="text-[9px] text-neutral-600 uppercase tracking-widest mb-2 px-1">Language</p>
            <div className="flex gap-1.5">
              {["English", "Hindi"].map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "flex-1 py-1.5 rounded text-[11px] font-medium transition-colors",
                    language === lang
                      ? "bg-[#FF9933] text-white"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation history */}
        {sidebarOpen && conversations.length > 0 && (
          <div className="px-3 py-3 flex-1 overflow-y-auto">
            <p className="text-[9px] text-neutral-600 uppercase tracking-widest mb-2 px-1">Recent</p>
            <div className="flex flex-col gap-0.5">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  className={cn(
                    "text-left px-2 py-2 rounded-lg text-[11px] transition-colors truncate",
                    activeConvId === conv.id
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300"
                  )}
                >
                  {conv.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clear */}
        <div className={cn("px-3 py-3 mt-auto border-t border-neutral-800", !sidebarOpen && "flex justify-center")}>
          <button
            onClick={() => { setMessages([]); setSuggestions([]); }}
            className="flex items-center gap-2 text-[11px] text-neutral-600 hover:text-neutral-400 transition-colors"
            title="Clear conversation"
          >
            <RotateCcw size={12} />
            {sidebarOpen && "Clear chat"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-col flex-1 min-w-0 h-full">

        {/* Top bar */}
        <div className="h-13 border-b border-neutral-200 bg-white flex items-center px-5 shrink-0">
          <div className="flex items-center gap-2">
            <activeServiceData.icon size={15} className="text-[#FF9933]" />
            <span className="text-sm font-medium text-neutral-800">{activeServiceData.label}</span>
            <span className="text-neutral-300 text-xs">·</span>
            <span className="text-xs text-neutral-400">{activeServiceData.desc}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Language toggle in topbar when sidebar collapsed */}
            {!sidebarOpen && (
              <div className="flex gap-1">
                {["English", "Hindi"].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                      language === lang ? "bg-neutral-900 text-white" : "text-neutral-400 hover:text-neutral-700"
                    )}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[11px] text-neutral-400">Live</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto">
              <div className="text-2xl font-bold tracking-widest text-neutral-900 mb-1">
                <span className="text-[#FF9933]">V</span>EER
              </div>
              <p className="text-sm text-neutral-400 mb-8 text-center">
                Verified guidance for Indian government services.<br />Ask anything or pick a quick action below.
              </p>
              <div className="grid grid-cols-2 gap-2 w-full">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    className="text-left px-4 py-3.5 rounded-xl border border-neutral-200 bg-white hover:border-[#FF9933]/40 hover:shadow-sm transition-all group"
                  >
                    <p className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">{action.label}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5 group-hover:text-neutral-500">Tap to ask VEER</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {messages.map((msg, i) => (
                <MessageBubble key={i} role={msg.role} content={msg.content} />
              ))}

              {/* Typing indicator */}
              {loading && messages[messages.length - 1]?.content === "" && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    V
                  </div>
                  <div className="flex gap-1 px-4 py-3 bg-white border border-neutral-200 rounded-2xl rounded-tl-sm shadow-sm">
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              {/* Follow-up suggestions */}
              {!loading && suggestions.length > 0 && (
                <div className="mt-2 mb-4">
                  <p className="text-[11px] text-neutral-400 mb-2 ml-10">Suggested follow-ups</p>
                  <div className="flex flex-wrap gap-2 ml-10">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-xs px-3 py-1.5 rounded-full border border-neutral-200 bg-white text-neutral-600 hover:border-[#FF9933]/50 hover:text-neutral-900 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-white shrink-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-3 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3 focus-within:border-neutral-400 focus-within:bg-white transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${activeService === "General" ? "any government service" : activeService}...`}
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-neutral-800 placeholder:text-neutral-400 max-h-32"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0 disabled:opacity-25 hover:bg-neutral-700 transition-colors"
              >
                <ArrowUp size={14} />
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 text-center mt-2">
              Always verify on official government portals before taking action
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}
