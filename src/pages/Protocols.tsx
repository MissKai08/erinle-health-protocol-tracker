"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, Edit3, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Protocol {
  id: string;
  title: string;
  type: string;
  content: string;
  conditions: string[];
  created_at: string;
  updated_at: string;
}

export default function Protocols() {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", type: "daily-schedule" as const, content: "", conditions: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("protocols").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setProtocols(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const conditions = form.conditions.split(",").map((c) => c.trim()).filter(Boolean);
    if (editingId) {
      await supabase.from("protocols").update({ title: form.title, type: form.type, content: form.content, conditions }).eq("id", editingId);
      setEditingId(null);
    } else {
      await supabase.from("protocols").insert({ user_id: user!.id, title: form.title, type: form.type, content: form.content, conditions });
    }
    setShowForm(false);
    setForm({ title: "", type: "daily-schedule", content: "", conditions: "" });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("protocols").delete().eq("id", id);
    fetchData();
  };

  const startEdit = (p: Protocol) => {
    setEditingId(p.id);
    setForm({ title: p.title, type: p.type as any, content: p.content, conditions: p.conditions.join(", ") });
    setShowForm(true);
  };

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Protocols</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your health protocols</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ title: "", type: "daily-schedule", content: "", conditions: "" }); setShowForm(true); }} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Add Protocol
        </Button>
      </div>

      {showForm && (
        <Card className="glass">
          <CardHeader><CardTitle className="text-lg font-heading">{editingId ? "Edit Protocol" : "New Protocol"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="ptitle">Title</Label>
                <Input id="ptitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Morning Supplement Schedule" className="mt-2" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ptype">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily-schedule">Daily Schedule</SelectItem>
                      <SelectItem value="pt-routine">PT Routine</SelectItem>
                      <SelectItem value="dietary">Dietary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pconditions">Conditions (comma-separated)</Label>
                  <Input id="pconditions" value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder="CIRS, PEM, Histamine" className="mt-2" />
                </div>
              </div>
              <div>
                <Label htmlFor="pcontent">Content (Markdown)</Label>
                <Textarea id="pcontent" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Write your protocol content here..." className="mt-2 min-h-[120px]" required />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-primary hover:bg-primary/90">{editingId ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {protocols.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-primary/30 mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">No protocols yet</h3>
          <p className="text-sm text-muted-foreground">Create your first protocol to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {protocols.map((p) => {
            const isExpanded = expandedId === p.id;
            return (
              <Card key={p.id} className="overflow-hidden">
                <CardHeader className="cursor-pointer py-3" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base font-heading">{p.title}</CardTitle>
                      <Badge variant="outline">{p.type}</Badge>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="prose dark:prose-invert max-w-none text-sm mb-4">
                      <ReactMarkdown>{p.content}</ReactMarkdown>
                    </div>
                    {p.conditions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {p.conditions.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(p)}><Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
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
