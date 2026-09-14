import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { Document } from "docx";

export default defineHandler(async (event) => {
  try {
    // Use type: "formData" to properly handle multipart/form-data uploads
    const body = await readBody(event, { type: "formData" });
    const file = body?.file;

    if (!file) {
      throw createError({ statusCode: 400, statusMessage: "No file provided" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const doc = await Document.load(buffer);
    const text = doc.getParagraphs().map((p) => p.getText()).join("\n");

    return { text: text || "(No text could be extracted from this DOCX)" };
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : "DOCX parsing failed",
    });
  }
});
