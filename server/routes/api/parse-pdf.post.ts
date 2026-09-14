import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import * as pdfParse from "pdf-parse";

export default defineHandler(async (event) => {
  try {
    const body = await readBody(event);
    const file = body?.file;

    if (!file) {
      throw createError({ statusCode: 400, statusMessage: "No file provided" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse.default(buffer);

    return { text: data.text || "(No text could be extracted from this PDF)" };
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : "PDF parsing failed",
    });
  }
});