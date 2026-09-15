import { defineHandler } from "nitro";
import { readFormData, createError } from "nitro/h3";
import JSZip from "jszip";

export default defineHandler(async (event) => {
  try {
    const formData = await readFormData(event);
    const file = formData.get("file");

    if (!file) {
      throw createError({ statusCode: 400, statusMessage: "No file provided" });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // DOCX is a ZIP archive containing word/document.xml
    const zip = new JSZip();
    const zipContents = await zip.loadAsync(buffer);
    
    const documentXml = await zipContents.file("word/document.xml")?.asText();
    
    if (!documentXml) {
      throw createError({ statusCode: 400, statusMessage: "Invalid DOCX file: missing document.xml" });
    }

    // Extract text from WordprocessingML
    const text = extractTextFromDocxXml(documentXml);

    return { text: text || "(No text could be extracted from this DOCX)" };
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : "DOCX parsing failed",
    });
  }
});

function extractTextFromDocxXml(xml: string): string {
  // Remove XML namespaces and tags, extract text content
  return xml
    .replace(/<w:[^>]*>/g, "") // Remove Word tags
    .replace(/<\/w:[^>]*>/g, " ") // Remove closing Word tags
    .replace(/&w[0-9]+;/g, " ") // Remove Word entity references
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}