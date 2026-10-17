import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

const supabase = createClient(url, key);

async function check() {
  const { data: purCols, error: purErr } = await supabase.from("purchases").select("*").limit(1);
  console.log("Purchases table sample:", purCols, purErr);

  const { data: ordCols, error: ordErr } = await supabase.from("orders").select("*").limit(1);
  console.log("Orders table sample:", ordCols, ordErr);

  const { data: mats, error: matErr } = await supabase.from("materials").select("id, title, price, is_premium, status, published").limit(3);
  console.log("Materials sample:", mats, matErr);
}

check();
