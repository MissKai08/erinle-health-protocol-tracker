import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";

export default defineHandler(async (event) => {
  const formData = await readBody(event);
  
  return { 
    text: "DOCX parsing requires multipart form data handling. Please use the server-side implementation with proper file upload handling.",
    error: "Not implemented - requires multipart parsing"
  };
});