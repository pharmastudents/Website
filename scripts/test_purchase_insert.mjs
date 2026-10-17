import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

const supabase = createClient(url, key);

async function testPurchase() {
  const studentId = "5b17b144-11ca-4593-a15b-8ddc5fce0b2d";
  const materialId = "fa784ff1-bc38-4642-a3af-f3e9aad0018e";

  const { data, error } = await supabase.from("purchases").insert({
    id: crypto.randomUUID(),
    student_id: studentId,
    material_id: materialId,
    amount: 79,
    status: "unlocked",
  }).select();

  console.log("Insert purchase result:", data, error);
}

testPurchase();
