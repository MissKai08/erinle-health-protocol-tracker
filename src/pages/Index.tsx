"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Pill,
  Clock,
  CalendarCheck,
  Activity,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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
}

interface DailyLog {
  id: string;
  item_id: string;
  item_type: string;
  done: boolean;
}

export default function Today() {
  const { user } = useAuth();
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [logEntries, setLogEntries] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTimings, setExpandedTimings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];

    const { data: supplementsData } = await supabase
      .from("supplements")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("timing", { ascending: true });

    const { data: logData } = await supabase
      .from("daily_log")
      .select("*")
      .eq("user_id", user!.id)
      .eq("log_date", today);

    setSupplements(supplementsData || []);
    setLogEntries(logData || []);
    setLoading(false);
  };

  const toggleItem = async (itemId: string, timing: string) => {
    const today = new Date().toISOString().split("T")[0];
    const existing = logEntries.find((l) => l.item_id === itemId);
    const newDone = !existing?.done;

    if (existing) {
      await supabase
        .from("daily_log")
        .update({ done: newDone })
        .eq("id", existing.id);
    } else {
      await supabase.from("daily_log").insert({
        user_id: user!.id,
        log_date: today,
        item_id: itemId,
        item_type: "supplement",
        done: newDone,
      });
    }

    setLogEntries((prev) => {
      if (existing) {
        return prev.map((l) => (l.id === existing.id ? { ...l, done: newDone } : l));
      }
      return [...prev, { id: crypto.randomUUID(), item_id: itemId, item_type: "supplement", done: newDone }];
    });
  };

  const toggleTiming = (timing: string) => {
    setExpandedTimings((prev) => ({ ...prev, [timing]: !prev[timing] }));
  };

  const grouped = supplements.reduce<Record<string, Supplement[]>>((acc, s) => {
    const timing = s.timing || "Other";
    if (!acc[timing]) acc[timing] = [];
    acc[timing].push(s);
    return acc;
  }, {});

  const doneCount = logEntries.filter((l) => l.done).length;
  const totalCount = supplements.length;
  const adherence = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Today</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {doneCount}/{totalCount} completed
          </Badge>
          <div className="glass rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-primary">{adherence}%</span>
            <span className="text-xs text-muted-foreground ml-1">adherence</span>
          </div>
        </div>
      </div>

      {/* Adherence progress bar */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Today's Progress</span>
          <span className="text-sm text-muted-foreground">{adherence}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${adherence}%` }}
          />
        </div>
      </div>

      {/* Supplement checklist grouped by timing */}
      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="h-12 w-12 text-primary/30 mb-4" />
            <h3 className="font-heading text-lg font-semibold mb-2">No active items yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add supplements or prescriptions to start tracking your daily protocol.
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <a href="/supplements" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add your first item
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([timing, items]) => {
            const isExpanded = expandedTimings[timing] ?? true;
            const timingDone = items.every((item) =>
              logEntries.some((l) => l.item_id === item.id && l.done)
            );

            return (
              <Card key={timing} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer py-3"
                  onClick={() => toggleTiming(timing)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base font-heading">{timing}</CardTitle>
                      <Badge variant={timingDone ? "default" : "secondary"} className="text-xs">
                        {items.filter((i) => logEntries.some((l) => l.item_id === i.id && l.done)).length}/{items.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="space-y-2 pt-0">
                    {items.map((item) => {
                      const logEntry = logEntries.find((l) => l.item_id === item.id);
                      const isDone = logEntry?.done ?? false;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                            isDone
                              ? "border-primary/20 bg-primary/5"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <Checkbox
                            checked={isDone}
                            onCheckedChange={() => toggleItem(item.id, timing)}
                            aria-label={`Mark ${item.name} as ${isDone ? "incomplete" : "complete"}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "font-medium",
                                  isDone && "line-through text-muted-foreground"
                                )}
                              >
                                {item.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {item.category}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {item.dose}{item.reason ? ` — ${item.reason}` : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
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
