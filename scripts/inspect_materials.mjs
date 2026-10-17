import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

const supabase = createClient(url, key);

async function inspectMaterialsSchema() {
  // Let's do a failed insert or check existing records to inspect columns
  const { data: existing, error: sErr } = await supabase.from("materials").select("*").limit(1);
  console.log("Existing material sample:", existing, sErr);

  // Probe all columns by attempting a dummy insert with empty object to get not-null constraints
  const { error: insErr } = await supabase.from("materials").insert({}).select();
  console.log("Empty insert error:", insErr);

  // Check storage buckets
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  console.log("Existing buckets:", buckets, bErr);
}

inspectMaterialsSchema();
