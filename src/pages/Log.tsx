"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus, Activity, TrendingUp, Clock, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface SymptomLog {
  id: string;
  log_date: string;
  symptom: string;
  severity: number;
  notes: string;
}

export default function Log() {
  const { user } = useAuth();
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newSymptom, setNewSymptom] = useState({ symptom: "", severity: 3, notes: "", log_date: new Date().toISOString().split("T")[0] });
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("symptom_log")
      .select("*")
      .eq("user_id", user!.id)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false });

    setSymptomLogs(data || []);
    setLoading(false);
  };

  const handleAddSymptom = async () => {
    if (!newSymptom.symptom) return;

    const { error } = await supabase.from("symptom_log").insert({
      user_id: user!.id,
      log_date: newSymptom.log_date,
      symptom: newSymptom.symptom,
      severity: newSymptom.severity,
      notes: newSymptom.notes,
    });

    if (!error) {
      setNewSymptom({ symptom: "", severity: 3, notes: "", log_date: new Date().toISOString().split("T")[0] });
      setIsAdding(false);
      fetchData();
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 2) return "bg-green-500";
    if (severity <= 3) return "bg-yellow-500";
    if (severity <= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  const getSeverityLabel = (severity: number) => {
    if (severity <= 2) return "Mild";
    if (severity <= 3) return "Moderate";
    if (severity <= 4) return "Severe";
    return "Very Severe";
  };

  const recentSymptoms = symptomLogs.slice(0, 10);
  const todaySymptoms = symptomLogs.filter((log) => log.log_date === newSymptom.log_date);

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
          <h1 className="font-heading text-3xl font-bold">Symptom Log</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and monitor your symptoms</p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Symptom
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Add symptom form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Add Symptom</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAdding ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="symptom">Symptom</Label>
                  <Input
                    id="symptom"
                    value={newSymptom.symptom}
                    onChange={(e) => setNewSymptom({ ...newSymptom, symptom: e.target.value })}
                    placeholder="e.g., Headache, Fatigue, Nausea"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Severity: {newSymptom.severity}/5 ({getSeverityLabel(newSymptom.severity)})</Label>
                  <Slider
                    value={[newSymptom.severity]}
                    onValueChange={(value) => setNewSymptom({ ...newSymptom, severity: value[0] })}
                    max={5}
                    min={1}
                    step={1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Mild</span>
                    <span>Moderate</span>
                    <span>Severe</span>
                    <span>Very Severe</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="date">Date</Label>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal mt-2"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newSymptom.log_date ? format(new Date(newSymptom.log_date), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={new Date(newSymptom.log_date)}
                        onSelect={(date) => {
                          setNewSymptom({ ...newSymptom, log_date: date?.toISOString().split("T")[0] || newSymptom.log_date });
                          setShowCalendar(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    value={newSymptom.notes}
                    onChange={(e) => setNewSymptom({ ...newSymptom, notes: e.target.value })}
                    placeholder="Any additional context..."
                    className="mt-2 min-h-[80px]"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAddSymptom}
                    className="flex-1 bg-primary hover:bg-primary/90"
                    disabled={!newSymptom.symptom}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsAdding(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Click "Add Symptom" to record a new symptom</p>
              </div>
            )}

            {/* Today's summary */}
            {todaySymptoms.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Today's Summary</h4>
                <div className="space-y-2">
                  {todaySymptoms.map((log) => (
                    <div key={log.id} className="flex items-center gap-2 text-sm">
                      <div className={cn("h-2 w-2 rounded-full", getSeverityColor(log.severity))} />
                      <span className="flex-1">{log.symptom}</span>
                      <Badge variant="outline" className="text-xs">
                        {log.severity}/5
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent symptoms */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Recent Symptoms</CardTitle>
          </CardHeader>
          <CardContent>
            {symptomLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No symptoms logged yet</p>
                <p className="text-sm mt-1">Start tracking to see patterns over time</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {symptomLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className={cn("h-3 w-3 rounded-full flex-shrink-0", getSeverityColor(log.severity))} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium truncate">{log.symptom}</h4>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.log_date), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Severity: {log.severity}/5 ({getSeverityLabel(log.severity)})
                        </Badge>
                        {log.notes && (
                          <p className="text-xs text-muted-foreground italic truncate max-w-xs">
                            "{log.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
