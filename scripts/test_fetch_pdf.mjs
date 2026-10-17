import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

const supabase = createClient(url, key);

async function testFetch() {
  const filePath = "122f3b3f-45b7-4e92-8a9c-9b4ece561878/acc3a101-d6cd-49c6-99ff-6281c155326b/56d33ce1-f1ce-4a2c-92b4-b1753c4ecb71/unit-1/1792069706154_BASICS_OF_PYTHON_PROGRAMMING_FOR_PHARMACEUTICAL_SCIENCES_UNIT-1.pdf";

  // 1. Download directly using supabase.storage.from("notes").download(filePath)
  const { data: blobData, error: dlErr } = await supabase.storage.from("notes").download(filePath);
  console.log("storage.download result:", blobData ? `Blob of size ${blobData.size}` : null, dlErr);

  // 2. Or create signed url
  const { data: signed, error: signErr } = await supabase.storage.from("notes").createSignedUrl(filePath, 3600);
  console.log("createSignedUrl:", signed?.signedUrl?.slice(0, 80) + "...", signErr);
}

testFetch();
