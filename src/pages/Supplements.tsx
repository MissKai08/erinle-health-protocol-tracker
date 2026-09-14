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
import { Switch } from "@/components/ui/switch";
import { Pill, Plus, Trash2, Edit3, ChevronDown, ChevronUp, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Supplement {
  id: string;
  name: string;
  category: string;
  dose: string;
  timing: string;
  status: string;
  conditions: string[];
  reason: string;
  prescriber?: string;
  refill_date?: string;
  created_at: string;
  updated_at: string;
}

const CONDITIONS = ["CIRS", "PEM", "Histamine", "MCAS"];

export default function Supplements() {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form, setForm] = useState({
    name: "", category: "supplement" as const, dose: "", timing: "", status: "active" as const,
    conditions: [] as string[], reason: "", prescriber: "", refill_date: "",
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("supplements").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setSupplements(data || []);
    setLoading(false);
  };

  const filtered = supplements.filter((s) => {
    const catMatch = filterCategory === "all" || s.category === filterCategory;
    const statusMatch = filterStatus === "all" || s.status === filterStatus;
    return catMatch && statusMatch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      user_id: user!.id, name: form.name, category: form.category, dose: form.dose, timing: form.timing,
      status: form.status, conditions: form.conditions, reason: form.reason,
      prescriber: form.category === "prescription" ? form.prescriber : null,
      refill_date: form.category === "prescription" && form.refill_date ? form.refill_date : null,
    };
    if (editingId) {
      await supabase.from("supplements").update(payload).eq("id", editingId);
      setEditingId(null);
    } else {
      await supabase.from("supplements").insert(payload);
    }
    setShowForm(false);
    setForm({ name: "", category: "supplement", dose: "", timing: "", status: "active", conditions: [], reason: "", prescriber: "", refill_date: "" });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("supplements").delete().eq("id", id);
    fetchData();
  };

  const startEdit = (s: Supplement) => {
    setEditingId(s.id);
    setForm({ name: s.name, category: s.category as any, dose: s.dose, timing: s.timing, status: s.status as any, conditions: s.conditions, reason: s.reason, prescriber: s.prescriber || "", refill_date: s.refill_date || "" });
    setShowForm(true);
  };

  const toggleCondition = (c: string) => {
    setForm((prev) => ({ ...prev, conditions: prev.conditions.includes(c) ? prev.conditions.filter((x) => x !== c) : [...prev.conditions, c] }));
  };

  if (loading) {
    return <div className="flex h-96 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Supplements & Prescriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your active protocols</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm({ name: "", category: "supplement", dose: "", timing: "", status: "active", conditions: [], reason: "", prescriber: "", refill_date: "" }); setShowForm(true); }} className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="supplement">Supplements</SelectItem>
            <SelectItem value="prescription">Prescriptions</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card className="glass">
          <CardHeader><CardTitle className="text-lg font-heading">{editingId ? "Edit Item" : "Add New Item"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sname">Name</Label>
                  <Input id="sname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Omega-3" className="mt-2" required />
                </div>
                <div>
                  <Label htmlFor="scategory">Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplement">Supplement</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sdose">Dose</Label>
                  <Input id="sdose" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} placeholder="e.g., 1000mg" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="stiming">Timing</Label>
                  <Input id="stiming" value={form.timing} onChange={(e) => setForm({ ...form, timing: e.target.value })} placeholder="e.g., Morning, With food" className="mt-2" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sstatus">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                    <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sreason">Reason</Label>
                  <Input id="sreason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Why this item?" className="mt-2" />
                </div>
              </div>
              <div>
                <Label>Conditions</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {CONDITIONS.map((c) => (
                    <div key={c} className="flex items-center gap-2">
                      <Switch checked={form.conditions.includes(c)} onCheckedChange={() => toggleCondition(c)} id={`cond-${c}`} />
                      <Label htmlFor={`cond-${c}`} className="text-sm">{c}</Label>
                    </div>
                  ))}
                </div>
              </div>
              {form.category === "prescription" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border rounded-lg">
                  <div>
                    <Label htmlFor="sprescriber">Prescriber</Label>
                    <Input id="sprescriber" value={form.prescriber} onChange={(e) => setForm({ ...form, prescriber: e.target.value })} placeholder="Dr. Smith" className="mt-2" />
                  </div>
                  <div>
                    <Label htmlFor="srefill">Refill Date</Label>
                    <Input id="srefill" type="date" value={form.refill_date} onChange={(e) => setForm({ ...form, refill_date: e.target.value })} className="mt-2" />
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" className="bg-primary hover:bg-primary/90">{editingId ? "Update" : "Create"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Pill className="h-12 w-12 text-primary/30 mb-4" />
          <h3 className="font-heading text-lg font-semibold mb-2">No items found</h3>
          <p className="text-sm text-muted-foreground">Add your first supplement or prescription.</p>
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
                      <Pill className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base font-heading">{s.name}</CardTitle>
                      <Badge variant={s.category === "prescription" ? "default" : "secondary"}>{s.category}</Badge>
                      <Badge variant={s.status === "active" ? "default" : "outline"}>{s.status}</Badge>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div><span className="text-xs text-muted-foreground">Dose:</span> {s.dose || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Timing:</span> {s.timing || "—"}</div>
                      <div><span className="text-xs text-muted-foreground">Reason:</span> {s.reason || "—"}</div>
                      {s.category === "prescription" && (
                        <>
                          <div><span className="text-xs text-muted-foreground">Prescriber:</span> {s.prescriber || "—"}</div>
                          <div><span className="text-xs text-muted-foreground">Refill:</span> {s.refill_date || "—"}</div>
                        </>
                      )}
                    </div>
                    {s.conditions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {s.conditions.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(s)}><Edit3 className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete</Button>
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
