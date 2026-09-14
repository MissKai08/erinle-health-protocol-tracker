"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle, XCircle, Pill, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

interface Supplement {
  id: string;
  name: string;
  category: string;
  dose: string;
  timing: string;
}

interface DailyLogEntry {
  id: string;
  item_id: string;
  item_type: string;
  done: boolean;
  log_date: string;
  supplements?: Supplement;
}

export default function History() {
  const { user } = useAuth();
  const [logEntries, setLogEntries] = useState<DailyLogEntry[]>([]);
  const [supplements, setSupplements] = useState<Record<string, Supplement>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: supplementsData } = await supabase
      .from("supplements")
      .select("*")
      .eq("user_id", user!.id);

    const { data: logData } = await supabase
      .from("daily_log")
      .select("*, supplements(*)")
      .eq("user_id", user!.id)
      .order("log_date", { ascending: false });

    const supplementsMap = (supplementsData || []).reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {} as Record<string, Supplement>);

    setSupplements(supplementsMap);
    setLogEntries((logData || []) as DailyLogEntry[]);
    setLoading(false);
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getLogForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return logEntries.filter((entry) => entry.log_date === dateStr);
  };

  const getAdherenceForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayEntries = logEntries.filter((entry) => entry.log_date === dateStr);
    if (dayEntries.length === 0) return null;
    const done = dayEntries.filter((e) => e.done).length;
    return { done, total: dayEntries.length, adherence: Math.round((done / dayEntries.length) * 100) };
  };

  const getMonthStats = () => {
    const days = getDaysInMonth();
    const daysWithLogs = days.filter((day) => getLogForDate(day).length > 0);
    const totalDone = daysWithLogs.reduce((sum, day) => {
      const stats = getAdherenceForDate(day);
      return stats ? sum + stats.done : sum;
    }, 0);
    const totalPossible = daysWithLogs.reduce((sum, day) => {
      const stats = getAdherenceForDate(day);
      return stats ? sum + stats.total : sum;
    }, 0);
    return totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  };

  const monthStats = getMonthStats();

  const renderCalendarDay = (day: Date) => {
    const isToday = isSameDay(day, new Date());
    const isSelected = isSameDay(day, selectedDate);
    const dayEntries = getLogForDate(day);
    const stats = getAdherenceForDate(day);

    let bgColor = "bg-transparent";
    let borderColor = "border-transparent";

    if (isSelected) {
      bgColor = "bg-primary/20";
      borderColor = "border-primary";
    } else if (isToday) {
      bgColor = "bg-secondary/50";
    }

    if (dayEntries.length > 0) {
      bgColor = "bg-primary/10";
      borderColor = "border-primary/30";
    }

    return (
      <button
        key={day.toISOString()}
        onClick={() => setSelectedDate(day)}
        className={cn(
          "h-10 w-10 rounded-lg text-sm font-medium transition-all",
          bgColor,
          borderColor,
          "hover:bg-primary/20 hover:border-primary/50"
        )}
      >
        {format(day, "d")}
      </button>
    );
  };

  const selectedDayEntries = getLogForDate(selectedDate);
  const selectedDayStats = getAdherenceForDate(selectedDate);

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
          <h1 className="font-heading text-3xl font-bold">History</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your adherence over time</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-medium">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="h-6 text-xs font-medium text-muted-foreground flex items-center justify-center">
                  {day}
                </div>
              ))}
              {getDaysInMonth().map((day) => {
                const dayOfWeek = day.getDay();
                return (
                  <div key={day.toISOString()} className="flex items-center justify-center">
                    {renderCalendarDay(day)}
                  </div>
                );
              })}
            </div>

            {/* Month stats */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">This Month</span>
                <span className="text-sm text-muted-foreground">{monthStats}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${monthStats}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected day details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-heading">
              {format(selectedDate, "MMMM d, yyyy")}
            </CardTitle>
            {selectedDayStats && (
              <div className="flex items-center gap-2 mt-2">
                {selectedDayStats.done === selectedDayStats.total ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-orange-600" />
                )}
                <Badge variant={selectedDayStats.done === selectedDayStats.total ? "default" : "secondary"}>
                  {selectedDayStats.done}/{selectedDayStats.total} completed
                </Badge>
                <Badge variant="outline">
                  {selectedDayStats.adherence}%
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedDayEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No entries for this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEntries.map((entry) => {
                  const supplement = supplements[entry.item_id];
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3",
                        entry.done ? "border-green-200 bg-green-50 dark:bg-green-950/20" : "border-orange-200 bg-orange-50 dark:bg-orange-950/20"
                      )}
                    >
                      {entry.done ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-orange-600" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4 text-primary" />
                          <span className="font-medium">{supplement?.name || "Unknown item"}</span>
                          <Badge variant="outline" className="text-xs">
                            {supplement?.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {supplement?.dose} • {supplement?.timing}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent entries list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-heading">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logEntries.slice(0, 20).map((entry) => {
              const supplement = supplements[entry.item_id];
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      entry.done ? "bg-green-500" : "bg-orange-500"
                    )} />
                    <span className="text-sm font-medium">{supplement?.name || "Unknown"}</span>
                    <Badge variant="outline" className="text-xs">
                      {supplement?.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{format(new Date(entry.log_date), "MMM d, yyyy")}</span>
                    {entry.done ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-orange-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}