import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envStr = fs.readFileSync(".env.local", "utf8");
const env = {};
for (const line of envStr.split("\n")) {
  const parts = line.split("=");
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join("=").trim();
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
  // Test inserting with urgent_only to see if column already exists
  const testId = "00000000-0000-0000-0000-000000000001";
  const { data, error } = await supabase.from("watch_rules").insert({
    id: testId,
    user_id: "00000000-0000-0000-0000-000000000000",
    name: "test",
    urgent_only: true,
    paint_free_only: true
  }).select();

  console.log("Insert result:", { data, error });

  if (error && error.message.includes("column")) {
    console.log("Column does not exist in watch_rules yet. We can handle it gracefully in supabase-store!");
  } else if (!error) {
    // Delete test row
    await supabase.from("watch_rules").delete().eq("id", testId);
    console.log("Columns already exist and work!");
  }
}

addColumns();
