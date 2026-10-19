import { createClient } from "@supabase/supabase-js"
import fs from "fs"

let envUrl = ""
let envKey = ""

try {
  const envContent = fs.readFileSync(".env", "utf-8")
  for (const line of envContent.split("\n")) {
    if (line.startsWith("VITE_SUPABASE_URL="))
      envUrl = line.split("=")[1].trim()
    if (line.startsWith("VITE_SUPABASE_ANON_KEY="))
      envKey = line.split("=")[1].trim()
  }
} catch (e) {}

const supabase = createClient(envUrl, envKey)

async function inspectProfiles() {
  const userId = "562e7191-2d40-43f9-aa28-0b24c150bb0c"
  console.log("--- Testing RPC ensure_profile_initialized ---")
  const { data: rpcRes, error: rpcErr } = await supabase.rpc(
    "ensure_profile_initialized",
  )
  console.log("RPC result:", rpcRes, "Error:", rpcErr)

  const { data: allProfiles, error: allErr } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, created_at")
    .limit(10)

  console.log("All visible profiles (limit 10):", allProfiles, "Error:", allErr)
}

inspectProfiles()
