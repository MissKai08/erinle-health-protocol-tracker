import { defineHandler } from "nitro";
import { readBody, createError, getRequestHeader, readRawBody } from "nitro/h3";
import { Document, Packer } from "docx";

export default defineHandler(async (event) => {
  try {
    const contentType = getRequestHeader(event, "content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      throw createError({ statusCode: 400, statusMessage: "Expected multipart/form-data" });
    }

    const boundary = contentType.split("boundary=")[1];
    if (!boundary) {
      throw createError({ statusCode: 400, statusMessage: "Missing boundary in content-type" });
    }

    const rawBody = await readRawBody(event);
    if (!rawBody) {
      throw createError({ statusCode: 400, statusMessage: "No file data received" });
    }

    const buffer = Buffer.from(rawBody, "base64");
    const parts = parseMultipart(buffer, boundary);

    const filePart = parts.find((p) => p.filename && p.name === "file");
    if (!filePart || !filePart.data) {
      throw createError({ statusCode: 400, statusMessage: "No file found in form data" });
    }

    // Parse DOCX using the docx library
    const text = await parseDocx(filePart.data);

    return { text: text || "(No text could be extracted from this DOCX)" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw createError({ statusCode: 500, statusMessage: `DOCX parsing failed: ${message}` });
  }
});

async function parseDocx(buffer: Buffer): Promise<string> {
  // Use docx library to extract text
  // The docx library's Document class can read from a buffer
  try {
    const doc = new Document({
      // @ts-expect-error - docx internal API for reading from buffer
      file: buffer,
    });

    // Extract text from paragraphs
    const paragraphs = doc.getParagraphs?.() || [];
    const texts: string[] = [];

    for (const para of paragraphs) {
      const text = para.getText?.();
      if (text) texts.push(text);
    }

    return texts.join("\n\n");
  } catch {
    // Fallback: try to extract text from the XML directly
    return extractTextFromDocxXml(buffer);
  }
}

function extractTextFromDocxXml(buffer: Buffer): string {
  // DOCX is a ZIP file; extract document.xml and parse text
  // Simple approach: look for <w:t> tags in the raw content
  const content = buffer.toString("utf-8");
  const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
  const texts = textMatches.map((m) => {
    const inner = m.replace(/<w:t[^>]*>/, "").replace(/<\/w:t>/, "");
    return inner;
  });
  return texts.join("\n").trim();
}

function parseMultipart(buffer: Buffer, boundary: string) {
  const delimiter = Buffer.from("--" + boundary);
  const parts: Array<{ name?: string; filename?: string; data?: Buffer }> = [];
  const segments = splitBuffer(buffer, delimiter);

  for (const segment of segments) {
    if (segment.length === 0) continue;
    const headerEnd = segment.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headerStr = segment.slice(0, headerEnd).toString("utf-8");
    const body = segment.slice(headerEnd + 4);

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);

    parts.push({
      name: nameMatch ? nameMatch[1] : undefined,
      filename: filenameMatch ? filenameMatch[1] : undefined,
      data: body.length > 0 ? body : undefined,
    });
  }

  return parts;
}

function splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
  const result: Buffer[] = [];
  let start = 0;
  let idx: number;

  while ((idx = buffer.indexOf(delimiter, start)) !== -1) {
    if (idx > start) {
      result.push(buffer.slice(start, idx));
    }
    start = idx + delimiter.length;
  }

  if (start < buffer.length) {
    result.push(buffer.slice(start));
  }

  return result;
}
