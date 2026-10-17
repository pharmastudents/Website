import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

const supabase = createClient(url, key);

async function checkUsers() {
  const { data: admins } = await supabase.from("admins").select("*");
  console.log("Admins table:", admins);

  const { data: profiles } = await supabase.from("profiles").select("*");
  console.log("Profiles table:", profiles);
}

checkUsers();
