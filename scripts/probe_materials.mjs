import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

const supabase = createClient(url, key);

async function probeMaterials() {
  const payload = {};
  for (let step = 0; step < 15; step++) {
    const { data, error } = await supabase.from("materials").insert(payload).select();
    if (!error) {
      console.log("Success! Full inserted row:", data[0]);
      await supabase.from("materials").delete().eq("id", data[0].id);
      break;
    }
    console.log(`Step ${step} error:`, error.message);
    const match = error.message.match(/null value in column "([^"]+)"/);
    if (match) {
      const col = match[1];
      console.log(`-> Detected required column: ${col}`);
      if (col === "title") payload[col] = "Test Material";
      else if (col === "year") payload[col] = 1;
      else if (col === "semester") payload[col] = 1;
      else if (col === "semester_id") payload[col] = "acc3a101-d6cd-49c6-99ff-6281c155326b";
      else if (col === "subject_id") {
        // Find a subject or insert dummy subject if needed
        const { data: subs } = await supabase.from("subjects").select("id").limit(1);
        payload[col] = subs?.[0]?.id || crypto.randomUUID();
      }
      else if (col === "course_id") payload[col] = "122f3b3f-45b7-4e92-8a9c-9b4ece561878";
      else if (col === "price") payload[col] = 0;
      else if (col === "type" || col === "material_type") payload[col] = "Notes";
      else payload[col] = "test";
    } else {
      console.log("Other error or constraint:", error);
      break;
    }
  }
}

probeMaterials();
