"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Library, Search, ChevronDown, ChevronUp, FileText, Calendar, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Source {
  id: string;
  title: string;
  source_type: string;
  content: string;
  date_captured: string;
  conditions: string[];
  linked_item_ids: string[];
  original_file_url: string | null;
  created_at: string;
}

const CONDITIONS = ["CIRS", "PEM", "Histamine", "MCAS"];

export default function Sources() {
  const { user } = useAuth();
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCondition, setFilterCondition] = useState<string>("all");
    const [filterType, setFilterType] = useState<string>("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searching, setSearching] = useState(false);
    const [promotingToProtocol, setPromotingToProtocol] = useState<string | null>(null);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (!error) setSources(data || []);
    setLoading(false);
  };

  const runSearch = async (query: string) => {
    setSearching(true);
    if (!query.trim()) {
      await fetchData();
      setSearching(false);
      return;
    }
    const { data, error } = await supabase
      .from("sources")
      .select("*")
      .eq("user_id", user!.id)
      .textSearch("search_vector", query)
      .order("created_at", { ascending: false });
    if (!error) setSources(data || []);
    setSearching(false);
  };

  const handleSearchChange = (value: string) => {
      setSearchQuery(value);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => runSearch(value), 300);
    };
  
    const promoteToProtocol = async (source: Source) => {
      setPromotingToProtocol(source.id);
      try {
        const { error } = await supabase
          .from("protocols")
          .insert({
            user_id: user!.id,
            title: source.title,
            type: "daily-schedule",
            content: source.content,
            conditions: source.conditions || [],
          });
        if (error) throw error;
        toast({
          title: "Protocol created",
          description: `"${source.title}" was promoted to a protocol.`,
        });
      } catch {
        toast({
          title: "Failed to promote",
          description: "There was an error creating the protocol.",
          variant: "destructive",
        });
      } finally {
        setPromotingToProtocol(null);
      }
    };
  
    const filtered = useMemo(() => {
    let result = sources;
    if (filterCondition !== "all") result = result.filter((s) => s.conditions?.includes(filterCondition));
    if (filterType !== "all") result = result.filter((s) => s.source_type === filterType);
    return result;
  }, [sources, filterCondition, filterType]);

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Sources</h1>
          <p className="text-sm text-muted-foreground mt-1">Your research library and saved sources</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search your library..."
            className="pl-10"
          />
        </div>
        <Select value={filterCondition} onValueChange={setFilterCondition}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Condition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Conditions</SelectItem>
            {CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="ai-chat">AI Chat</SelectItem>
            <SelectItem value="pdf">PDF</SelectItem>
            <SelectItem value="docx">DOCX</SelectItem>
            <SelectItem value="article">Article</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {searching && <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> Searching...</div>}

      {filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Library className="h-12 w-12 text-primary/30 mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">No sources found</h3>
          <p className="text-sm text-muted-foreground">Upload files or save research to build your library.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isExpanded = expandedId === s.id;
            return (
              <Card key={s.id} className="overflow-hidden">
                <CardHeader className="cursor-pointer py-3" onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base font-heading">{s.title}</CardTitle>
                      <Badge variant="outline">{s.source_type}</Badge>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
                {isExpanded && (
                                  <CardContent className="pt-0">
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {s.date_captured}</span>
                                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {s.conditions?.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mb-3">
                                        {s.conditions.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                                      </div>
                                    )}
                                    <div className="prose dark:prose-invert max-w-none text-sm mb-4">
                                      <ReactMarkdown>{s.content}</ReactMarkdown>
                                    </div>
                                    {s.original_file_url && (
                                      <div className="mb-3">
                                        <Button
                                          variant="link"
                                          size="sm"
                                          onClick={async (e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const { data, error } = await supabase.storage
                                              .from("library-uploads")
                                              .getSignedUrl(s.original_file_url!);
                                            if (error) {
                                              toast({
                                                title: "Unable to open file",
                                                description: "The original file could not be accessed.",
                                                variant: "destructive",
                                              });
                                              return;
                                            }
                                            if (data?.signedUrl) {
                                              window.open(data.signedUrl, "_blank", "noopener,noreferrer");
                                            }
                                          }}
                                          className="flex items-center gap-1"
                                        >
                                          <ExternalLink className="h-3 w-3" /> Original File
                                        </Button>
                                      </div>
                                    )}
                                    <div className="mt-4 pt-4 border-t">
                                      <Button
                                        onClick={() => promoteToProtocol(s)}
                                        className="w-full bg-primary hover:bg-primary/90"
                                        disabled={promotingToProtocol === s.id}
                                      >
                                        {promotingToProtocol === s.id ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <Sparkles className="mr-2 h-4 w-4" />
                                        )}
                                        {promotingToProtocol === s.id ? "Promoting..." : "Promote to Protocol"}
                                      </Button>
                                    </div>
                                  </CardContent>
                                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
