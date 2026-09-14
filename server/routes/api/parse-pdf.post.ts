import { defineHandler } from "nitro";
import { readBody, createError, getRequestHeader, readRawBody } from "nitro/h3";
import pdfParse from "pdf-parse";

export default defineHandler(async (event) => {
  try {
    const body = await readBody(event);

    // Handle multipart form data
    const contentType = getRequestHeader(event, "content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      throw createError({ statusCode: 400, statusMessage: "Expected multipart/form-data" });
    }

    // Parse multipart form data manually
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

    const data = await pdfParse(filePart.data);
    const text = data.text || "(No text could be extracted from this PDF)";

    return { text, pages: data.numpages, info: data.info };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    throw createError({ statusCode: 500, statusMessage: `PDF parsing failed: ${message}` });
  }
});

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
