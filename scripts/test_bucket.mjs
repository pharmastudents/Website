import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

const supabase = createClient(url, key);

async function testBucket() {
  const { data: files, error } = await supabase.storage.from("notes").list();
  console.log("Storage from('notes').list():", files, error);

  // Test uploading a small dummy PDF file
  const testBuffer = Buffer.from("%PDF-1.4 dummy pdf content for testing");
  const testPath = `test/test-${Date.now()}.pdf`;
  const { data: uploadData, error: upErr } = await supabase.storage
    .from("notes")
    .upload(testPath, testBuffer, { contentType: "application/pdf" });
  console.log("Upload test to 'notes':", uploadData, upErr);

  if (uploadData) {
    const { data: signedData, error: signErr } = await supabase.storage
      .from("notes")
      .createSignedUrl(testPath, 60);
    console.log("Signed URL test:", signedData, signErr);

    await supabase.storage.from("notes").remove([testPath]);
    console.log("Cleaned up test file.");
  }
}

testBucket();
