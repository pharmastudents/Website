import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

const supabase = createClient(url, key);

async function testWithAuth() {
  // Let's test what policies or tables allow
  // What about orders table?
  const { data: ord, error: ordErr } = await supabase.from("orders").insert({
    id: "ORD-TEST-1",
    student_id: "5b17b144-11ca-4593-a15b-8ddc5fce0b2d",
    amount: 79,
    status: "Paid",
  }).select();
  console.log("Insert order unauthenticated:", ord, ordErr);
}

testWithAuth();
