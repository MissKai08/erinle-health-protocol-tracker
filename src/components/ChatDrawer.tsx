"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// ScrollArea is replaced with a plain scrollable div so the scrollRef targets the actual scroll container
import { toast } from "@/components/ui/use-toast";
import {
  MessageSquare,
  X,
  Send,
  Database,
  Search,
  Save,
  Globe,
  Loader2,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: "library" | "research";
  sources?: Array<{ title: string; type: string }>;
}

export function ChatDrawer() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"library" | "research">("library");
  const [isLoading, setIsLoading] = useState(false);
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [activeMode, setActiveMode] = useState<"library" | "research">("library");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener("open-chat", handleOpenChat);
    return () => window.removeEventListener("open-chat", handleOpenChat);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchLibraryContext = async (query: string) => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("sources")
      .select("id, title, content, source_type")
      .eq("user_id", user.id)
      .limit(20);

    if (error) return [];

    // Simple relevance scoring
    const queryWords = query.toLowerCase().split(/\s+/);
    const scored = data.map((item) => {
      const content = (item.content || "").toLowerCase();
      const title = (item.title || "").toLowerCase();
      let score = 0;
      queryWords.forEach((word) => {
        if (title.includes(word)) score += 10;
        if (content.includes(word)) score += 5;
      });
      return { ...item, relevanceScore: score };
    });

    return scored.filter((item) => item.relevanceScore > 0).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
  };

  const fetchActiveSupplements = async () => {
    if (!user) return [];
    const { data } = await supabase
      .from("supplements")
      .select("id, name, dose, timing, category")
      .eq("user_id", user.id)
      .eq("status", "active");
    return data || [];
  };

  const handleLibraryQuery = async (query: string) => {
    setIsLoading(true);
    try {
      const contextItems = await fetchLibraryContext(query);
      const activeItems = await fetchActiveSupplements();

      const contextText = contextItems.length > 0
        ? `Based on your library (${contextItems.length} relevant sources) and active items (${activeItems.length}):\n\n` +
          contextItems.slice(0, 3).map(s => `- ${s.title}: ${(s.content || "").substring(0, 200)}`).join("\n")
        : "No relevant sources found in your library.";

      const response = `I found ${contextItems.length} relevant sources in your library related to "${query}". 

${contextText}

Your ${activeItems.length} active supplements/prescriptions are: ${activeItems.map(a => `${a.name} (${a.dose}, ${a.timing})`).join(", ")}.

Would you like me to help you cross-reference this with your active protocol?`;

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: response, mode: "library", sources: contextItems.slice(0, 3).map(s => ({ title: s.title, type: s.source_type })) },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "Sorry, I encountered an error searching your library.", mode: "library" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResearchQuery = async (query: string) => {
    setIsLoading(true);
    try {
      const activeItems = await fetchActiveSupplements();
      const activeNames = activeItems.map(a => a.name.toLowerCase());

      // Simulate research response (in production, would call an AI/LLM API)
      const response = `Research results for "${query}":

Based on your current active list (${activeNames.join(", ")}), here are some considerations:

1. **Compatibility Check**: This query would typically be cross-referenced with your active supplements/prescriptions for interactions.

2. **Key Considerations**: 
   - Review timing to avoid conflicts with your existing schedule
   - Check if any conditions (CIRS/PEM/Histamine/MCAS) are relevant
   - Consider consulting your prescriber before adding new items

3. **Recommendation**: Save this research to your Sources for future reference.

Would you like me to save this research to your Sources?`;

      const newMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: response,
        mode: "research",
      };
      setMessages((prev) => [...prev, newMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "Sorry, I encountered an error during research.", mode: "research" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      mode: activeMode,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    if (activeMode === "library") {
      await handleLibraryQuery(userMsg.content);
    } else {
      await handleResearchQuery(userMsg.content);
    }
  };

  const handleSaveToSources = async (message: Message) => {
    if (!user) return;
    const { error } = await supabase.from("sources").insert({
      user_id: user.id,
      title: `Research: ${message.content.substring(0, 60)}`,
      source_type: "ai-chat",
      content: message.content,
      date_captured: new Date().toISOString().split("T")[0],
      conditions: [],
    });
    if (!error) {
      toast({ title: "Saved to Sources", description: "Research saved successfully." });
    }
  };

  return (
    <>
      {/* Chat toggle button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg shadow-primary/30 bg-primary hover:bg-primary/90 no-print",
          isOpen && "hidden"
        )}
        aria-label="Open chat"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>

      {/* Chat drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-center sm:justify-end p-4 no-print">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md glass-strong rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar-background/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-heading font-semibold">Ask Erinlè</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center gap-2 p-3 border-b border-border">
              <Button
                variant={activeMode === "library" ? "default" : "outline"}
                size="sm"
                className={cn(
                  activeMode === "library" && "bg-primary hover:bg-primary/90"
                )}
                onClick={() => setActiveMode("library")}
              >
                <Database className="mr-1.5 h-3.5 w-3.5" />
                My Library
              </Button>
              <Button
                variant={activeMode === "research" ? "default" : "outline"}
                size="sm"
                className={cn(
                  activeMode === "research" && "bg-primary hover:bg-primary/90"
                )}
                onClick={() => setActiveMode("research")}
              >
                <Globe className="mr-1.5 h-3.5 w-3.5" />
                Research
              </Button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      {activeMode === "library" ? (
                        <Database className="h-6 w-6 text-primary" />
                      ) : (
                        <Search className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activeMode === "library"
                        ? "Ask questions about your saved sources, protocols, and supplements."
                        : "Research new topics. Save interesting findings to your Sources."}
                    </p>
                  </div>
                )}

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "glass rounded-bl-sm"
                      )}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>

                      {msg.role === "assistant" && msg.mode === "research" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-3 bg-accent text-accent-foreground hover:bg-accent/80"
                          onClick={() => handleSaveToSources(msg)}
                        >
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          Save to Sources
                        </Button>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="glass rounded-2xl rounded-bl-sm px-4 py-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={
                    activeMode === "library"
                      ? "Ask about your library..."
                      : "Research something new..."
                  }
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
