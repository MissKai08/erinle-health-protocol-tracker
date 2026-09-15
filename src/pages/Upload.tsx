"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload as UploadIcon, FileText, File, AlertCircle, CheckCircle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const SUPPORTED_EXTENSIONS = [".html", ".htm", ".mht", ".mhtml", ".docx", ".pdf", ".md", ".markdown"];
const UNSUPPORTED_EXTENSIONS = [".doc", ".xlsx", ".xls", ".ppt", ".pptx"];

interface UploadResult {
  success: boolean;
  message: string;
  sourceId?: string;
}

export default function Upload() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [sourceType, setSourceType] = useState("article");
  const [conditions, setConditions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const CONDITIONS = ["CIRS", "PEM", "Histamine", "MCAS"];

  const validateFile = (file: File): { valid: boolean; message: string } => {
    const ext = "." + file.name.split(".").pop()!.toLowerCase();
    if (UNSUPPORTED_EXTENSIONS.includes(ext)) {
      if (ext === ".doc") return { valid: false, message: "Please upload a .docx file instead of .doc." };
      if ([".xlsx", ".xls"].includes(ext)) return { valid: false, message: "Spreadsheets are not supported yet. Please upload a PDF, DOCX, or HTML file." };
      return { valid: false, message: `File type ${ext} is not supported.` };
    }
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return { valid: false, message: `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}` };
    }
    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, message: "File size must be under 10MB." };
    }
    return { valid: true, message: "" };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const validation = validateFile(selected);
    if (!validation.valid) {
      toast({ title: "Upload Error", description: validation.message, variant: "destructive" });
      return;
    }
    setFile(selected);
    if (!title) setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    setResult(null);
  };

  const parseFileContent = async (file: File): Promise<string> => {
    const ext = "." + file.name.split(".").pop()!.toLowerCase();
    const text = await file.text();

    if (ext === ".html" || ext === ".htm") {
      return parseHtmlToMarkdown(text);
    }
    if (ext === ".mht" || ext === ".mhtml") {
      return parseMhtToMarkdown(text);
    }
    if (ext === ".pdf") {
      return await parsePdfToMarkdown(file);
    }
    if (ext === ".docx") {
      return await parseDocxToMarkdown(file);
    }
    if (ext === ".md" || ext === ".markdown") {
      return text;
    }
    return text;
  };

  const parseHtmlToMarkdown = (html: string): string => {
    const cleaned = html
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");
    const text = cleaned
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n# $1\n")
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
      .replace(/<p[^>]*>(.*?)<\/p>/gi, "\n$1\n")
      .replace(/<li[^>]*>(.*?)<\/li>/gi, "\n- $1\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text;
  };

  const parseMhtToMarkdown = (content: string): string => {
    // MHT files are MIME-encoded; extract text content
    const boundaryMatch = content.match(/boundary="?([^";\r\n]+)"?/i);
    if (boundaryMatch) {
      const parts = content.split(new RegExp(`--${boundaryMatch[1]}`, "i"));
      for (const part of parts) {
        if (part.includes("Content-Type: text/html") || part.includes("Content-Type: text/plain")) {
          const bodyMatch = part.split("\r\n\r\n");
          if (bodyMatch.length > 1) {
            const body = bodyMatch.slice(1).join("\r\n\r\n");
            if (part.includes("text/html")) return parseHtmlToMarkdown(body);
            return body.trim();
          }
        }
      }
    }
    // Fallback: try to extract readable text
    return content.replace(/[^\x20-\x7E\n\r\t]/g, "").replace(/\n{3,}/g, "\n\n").trim();
  };

  const parsePdfToMarkdown = async (file: File): Promise<string> => {
    try {
      // Use the server-side Nitro route for PDF parsing
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        // Try to read the actual error message from the response
        let errorMessage = "PDF parsing failed";
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If we can't parse JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      return data.text || "(No text could be extracted from this PDF)";
    } catch (err) {
      return `Unable to parse PDF: ${err instanceof Error ? err.message : "Unknown error"}. Please try converting to DOCX or HTML.`;
    }
  };

  const parseDocxToMarkdown = async (file: File): Promise<string> => {
    try {
      // Use the server-side Nitro route for DOCX parsing
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/parse-docx", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        // Try to read the actual error message from the response
        let errorMessage = "DOCX parsing failed";
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If we can't parse JSON, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      return data.text || "(No text could be extracted from this DOCX)";
    } catch (err) {
      return `Unable to parse DOCX: ${err instanceof Error ? err.message : "Unknown error"}.`;
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    setResult(null);

    try {
      // 1. Upload raw file to storage bucket
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("library-uploads")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const fileUrl = uploadData?.path;

      // 2. Parse file content
      const parsedContent = await parseFileContent(file);

      // 3. Create sources row
      const { data: sourceData, error: sourceError } = await supabase.from("sources").insert({
        user_id: user.id,
        title: title || file.name,
        source_type: sourceType,
        content: parsedContent,
        date_captured: new Date().toISOString().split("T")[0],
        conditions: conditions,
        linked_item_ids: [],
        original_file_url: fileUrl,
      }).select();

      if (sourceError) throw sourceError;

      setResult({
        success: true,
        message: `Successfully uploaded and parsed "${title || file.name}". Content saved to your Sources library.`,
        sourceId: sourceData?.[0]?.id,
      });
      toast({ title: "Upload Complete", description: "File saved to your Sources library." });
      setFile(null);
      setTitle("");
      setConditions([]);
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Upload failed. Please try again.",
      });
      toast({ title: "Upload Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleCondition = (c: string) => {
    setConditions((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Upload</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload files to your library</p>
        </div>
      </div>

      <Card className="glass">
        <CardHeader><CardTitle className="text-lg font-heading">Upload File</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="file">File</Label>
            <div className="mt-2">
              <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed transition-colors hover:border-primary/50">
                <UploadIcon className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  {file ? file.name : "Click to upload or drag & drop"}
                </span>
                <input id="file" type="file" className="hidden" accept=".html,.htm,.mht,.mhtml,.docx,.pdf,.md,.markdown" onChange={handleFileChange} />
              </label>
            </div>
            {file && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <File className="h-4 w-4 text-muted-foreground" />
                <span>{file.name}</span>
                <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                <button onClick={() => setFile(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="mt-2 text-xs text-muted-foreground">
              Supported: .html, .htm, .mht, .mhtml, .docx, .pdf, .md, .markdown (text-based only)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Source title" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="type">Source Type</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="article">Article</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="ai-chat">AI Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Conditions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CONDITIONS.map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <input type="checkbox" id={`cond-${c}`} checked={conditions.includes(c)} onChange={() => toggleCondition(c)} className="rounded border-border" />
                  <Label htmlFor={`cond-${c}`} className="text-sm">{c}</Label>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><UploadIcon className="mr-2 h-4 w-4" /> Upload & Parse</>}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className={cn("flex items-start gap-3", result.success ? "text-green-600" : "text-red-600")}>
              {result.success ? <CheckCircle className="h-5 w-5 mt-0.5" /> : <AlertCircle className="h-5 w-5 mt-0.5" />}
              <p className="text-sm">{result.message}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
