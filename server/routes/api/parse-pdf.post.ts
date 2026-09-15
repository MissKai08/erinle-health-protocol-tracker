import { defineHandler } from "nitro";
import { readFormData, createError } from "nitro/h3";
import { PDFParse } from "pdf-parse";

export default defineHandler(async (event) => {
  try {
    // Use readFormData to properly handle multipart/form-data uploads
    const formData = await readFormData(event);
    const file = formData.get("file");

    if (!file) {
      throw createError({ statusCode: 400, statusMessage: "No file provided" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // pdf-parse v2 exposes a class-based API
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();

    await parser.destroy();

    return { text: result.text || "(No text could be extracted from this PDF)" };
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : "PDF parsing failed",
    });
  }
});