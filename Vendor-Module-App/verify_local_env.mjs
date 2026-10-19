import fs from "fs"
import path from "path"

function parseEnvKeys(filePath) {
  if (!fs.existsSync(filePath)) return null
  const content = fs.readFileSync(filePath, "utf-8")
  const configuredKeys = new Set()
  const emptyKeys = new Set()

  for (const line of content.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^['"]|['"]$/g, "")
      if (val.length > 0) {
        configuredKeys.add(key)
      } else {
        emptyKeys.add(key)
      }
    }
  }

  return { configuredKeys, emptyKeys }
}

function runVerification() {
  console.log(
    "================================================================",
  )
  console.log(
    "  ROADRIDER LOCAL ENVIRONMENT & SECRETS CONFIGURATION AUDIT     ",
  )
  console.log(
    "================================================================\n",
  )

  let hasErrors = false

  // 1. Root .env Safety Check
  console.log("--- 1. Root .env (Frontend Environment) ---")
  const rootEnvPath = path.resolve(".env")
  const rootEnv = parseEnvKeys(rootEnvPath)

  if (!rootEnv) {
    console.log("  [ERROR] Root .env file not found.")
    hasErrors = true
  } else {
    // Check required frontend keys
    const frontendRequired = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]
    for (const key of frontendRequired) {
      if (rootEnv.configuredKeys.has(key)) {
        console.log(`  [OK] ${key} is configured`)
      } else {
        console.log(`  [MISSING] ${key} is NOT configured`)
        hasErrors = true
      }
    }

    // Check that NO backend secrets leaked into root .env
    const forbiddenSecrets = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "SERVICE_ROLE_KEY",
      "MSG91_AUTH_KEY",
      "MSG91_TEMPLATE_ID",
      "SEND_SMS_HOOK_SECRET",
      "HOOK_SECRET",
      "SUPABASE_JWT_SECRET",
    ]
    let leakedSecrets = []
    for (const sec of forbiddenSecrets) {
      if (rootEnv.configuredKeys.has(sec) || rootEnv.emptyKeys.has(sec)) {
        leakedSecrets.push(sec)
      }
    }

    if (leakedSecrets.length > 0) {
      console.log(
        `  [LEAK WARNING] Backend secrets detected in frontend .env: ${leakedSecrets.join(", ")}`,
      )
      console.log("                 Remove these from root .env immediately.")
      hasErrors = true
    } else {
      console.log("  [OK] No backend secrets leaked into frontend root .env")
    }
  }

  // 2. Gitignore Verification
  console.log("\n--- 2. Gitignore Secrets Protection ---")
  const gitignorePath = path.resolve(".gitignore")
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8")
    const isFunctionsEnvIgnored =
      gitignoreContent.includes("supabase/functions/.env") ||
      gitignoreContent.includes(".env*")

    if (isFunctionsEnvIgnored) {
      console.log(
        "  [OK] supabase/functions/.env is safely excluded by .gitignore",
      )
    } else {
      console.log(
        "  [WARNING] supabase/functions/.env is NOT explicitly in .gitignore",
      )
      hasErrors = true
    }
  }

  // 3. Edge Functions Local Secrets (.env)
  console.log(
    "\n--- 3. Edge Functions Local Secrets (supabase/functions/.env) ---",
  )
  const funcEnvPath = path.resolve("supabase/functions/.env")
  const funcEnv = parseEnvKeys(funcEnvPath)

  if (!funcEnv) {
    console.log("  [ERROR] supabase/functions/.env does not exist.")
    console.log(
      "          Create it by copying supabase/functions/.env.example.",
    )
    hasErrors = true
  } else {
    console.log("  [FOUND] supabase/functions/.env exists.")

    const functionsSpecs = [
      {
        name: "msg91-verify-widget-token (Primary Widget Flow)",
        required: [
          "MSG91_AUTH_KEY",
          "SUPABASE_URL",
          "SUPABASE_SERVICE_ROLE_KEY",
          "SUPABASE_ANON_KEY",
        ],
        optional: ["SUPABASE_JWT_SECRET"],
      },
      {
        name: "msg91-verify-otp (Direct OTP / Widget Fallback)",
        required: [
          "MSG91_AUTH_KEY",
          "SUPABASE_URL",
          "SUPABASE_SERVICE_ROLE_KEY",
          "SUPABASE_ANON_KEY",
        ],
        optional: ["SUPABASE_JWT_SECRET"],
      },
      {
        name: "msg91-send-otp (SMS Dispatch)",
        required: ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"],
        optional: ["MSG91_SENDER_ID", "MSG91_OTP_EXPIRY"],
      },
      {
        name: "msg91-resend-otp (SMS Resend / Retry)",
        required: ["MSG91_AUTH_KEY"],
        optional: ["MSG91_TEMPLATE_ID", "MSG91_SENDER_ID", "MSG91_OTP_EXPIRY"],
      },
      {
        name: "send-sms-hook (Supabase Auth Webhook Hook)",
        required: ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"],
        optional: ["MSG91_SENDER_ID", "SEND_SMS_HOOK_SECRET", "HOOK_SECRET"],
      },
    ]

    for (const fn of functionsSpecs) {
      console.log(`\n  Function: ${fn.name}`)
      const missingRequired = fn.required.filter(
        (k) => !funcEnv.configuredKeys.has(k),
      )
      const configuredRequired = fn.required.filter((k) =>
        funcEnv.configuredKeys.has(k),
      )

      for (const k of configuredRequired) {
        console.log(`    [CONFIGURED] ${k}`)
      }
      for (const k of missingRequired) {
        console.log(`    [MISSING]    ${k} (Required)`)
      }

      if (missingRequired.length > 0) {
        hasErrors = true
      }
    }
  }

  console.log(
    "\n================================================================",
  )
  if (hasErrors) {
    console.log("  STATUS: ACTION REQUIRED — Please fill in missing secrets in")
    console.log("          supabase/functions/.env (see details above).")
  } else {
    console.log(
      "  STATUS: READY — All required environment variables are configured!",
    )
  }
  console.log(
    "================================================================\n",
  )

  process.exit(hasErrors ? 1 : 0)
}

runVerification()
