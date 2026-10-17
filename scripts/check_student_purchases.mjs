import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

const supabase = createClient(url, key);

async function check() {
  const { data: profs, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("email", "%rspteam%");
  console.log("Profiles matching rspteam:", profs, error);

  const { data: purs } = await supabase.from("purchases").select("*");
  console.log("Purchases in database:", purs);

  const { data: ords } = await supabase.from("orders").select("*");
  console.log("Orders in database:", ords);
}

check();
