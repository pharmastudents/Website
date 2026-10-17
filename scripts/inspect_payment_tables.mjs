import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/);
const url = urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";
const key = keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, "") : "";

const supabase = createClient(url, key);

async function inspect() {
  const tables = [
    "orders",
    "order_items",
    "payments",
    "purchases",
    "material_purchases",
    "payment_webhook_events"
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (error) {
      console.log(`[${t}] Error: ${error.message} (code: ${error.code})`);
    } else {
      console.log(`[${t}] Table exists! Sample keys:`, data.length > 0 ? Object.keys(data[0]) : "Empty table");
    }
  }

  // Also probe candidate columns on 'orders'
  const candidateOrderCols = [
    "id", "student_id", "amount", "final_amount", "discount", "total_amount",
    "currency", "status", "razorpay_order_id", "transaction_id", "order_date",
    "payment_date", "product_title", "product_id", "product_type", "material_ids",
    "gateway", "created_at", "updated_at"
  ];
  const validOrderCols = [];
  for (const col of candidateOrderCols) {
    const { error } = await supabase.from("orders").select(col).limit(1);
    if (!error) validOrderCols.push(col);
  }
  console.log("\n[orders] existing columns:", validOrderCols.join(", "));

  // Also probe candidate columns on 'purchases'
  const candidatePurchaseCols = [
    "id", "student_id", "material_id", "order_id", "amount", "payment_status", "status", "created_at", "purchased_at"
  ];
  const validPurCols = [];
  for (const col of candidatePurchaseCols) {
    const { error } = await supabase.from("purchases").select(col).limit(1);
    if (!error) validPurCols.push(col);
  }
  console.log("\n[purchases] existing columns:", validPurCols.join(", "));
}

inspect();
