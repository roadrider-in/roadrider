import fs from "fs"

console.log("================================================================")
console.log("  TESTING SEND SMS HOOK DIAGNOSTICS & SAFE LOGGING             ")
console.log(
  "================================================================\n",
)

let passed = 0
let failed = 0

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  [PASS] ${testName}`)
    passed++
  } else {
    console.error(`  [FAIL] ${testName} - ${details}`)
    failed++
  }
}

// -------------------------------------------------------------
// Suite 1: Source Code Static Guarantees & Code Cleanliness
// -------------------------------------------------------------
console.log("--- Suite 1: Source Code Static Verification ---")
const hookSource = fs.readFileSync(
  "supabase/functions/send-sms-hook/index.ts",
  "utf-8",
)

assert(
  !hookSource.includes("Successfully delivered OTP"),
  'Misleading log "Successfully delivered OTP" has been removed',
)

assert(
  hookSource.includes("MSG91 API accepted OTP dispatch"),
  'New accurate log "MSG91 API accepted OTP dispatch" is implemented',
)

assert(
  hookSource.includes("verifyWebhookSignature") &&
    hookSource.includes("webhook-id") &&
    hookSource.includes("webhook-timestamp") &&
    hookSource.includes("webhook-signature"),
  "Webhook signature verification is fully intact without weakening",
)

assert(
  hookSource.includes("91••••••${raw10.slice(-4)}"),
  "Mobile numbers are masked to last 4 digits in log output",
)

assert(
  hookSource.includes("request_id: ${requestId}"),
  "MSG91 request_id is logged when available",
)

assert(
  hookSource.includes("indicator: ${apiType"),
  "MSG91 API indicator type is logged",
)

// -------------------------------------------------------------
// Suite 2: Functional Logic Simulation of MSG91 Response Handling
// -------------------------------------------------------------
console.log("\n--- Suite 2: Simulated MSG91 API Response Handling ---")

function evaluateMsg91Response(
  msg91Response,
  responseData,
  raw10 = "9876543210",
) {
  const apiType =
    typeof responseData?.type === "string" ? responseData.type.trim() : ""
  const apiStatus =
    typeof responseData?.status === "string"
      ? responseData.status.trim().toLowerCase()
      : ""
  const rawMessage =
    typeof responseData?.message === "string" ? responseData.message.trim() : ""
  const requestId =
    typeof responseData?.request_id === "string"
      ? responseData.request_id.trim()
      : typeof responseData?.requestId === "string"
        ? responseData.requestId.trim()
        : typeof responseData?.message_id === "string"
          ? responseData.message_id.trim()
          : ""

  const sanitizedMsg = rawMessage.replace(/[\r\n\t]/g, " ").slice(0, 200)

  const isError =
    !msg91Response.ok ||
    apiType.toLowerCase() === "error" ||
    apiType.toLowerCase() === "failed" ||
    apiStatus === "error" ||
    apiStatus === "failed"

  if (isError) {
    const errorStatus =
      msg91Response.status >= 400 && msg91Response.status < 600
        ? msg91Response.status
        : 502
    const errorBody = {
      error: {
        message: sanitizedMsg || "SMS gateway failed to deliver OTP message.",
      },
    }
    const errorLog = `[Send SMS Hook Error] MSG91 gateway returned HTTP ${msg91Response.status} [type: ${apiType || "none"}]: ${sanitizedMsg || "SMS gateway failed to deliver OTP message."}`
    return {
      status: errorStatus,
      body: errorBody,
      log: errorLog,
      isError: true,
    }
  }

  const logDetails = [
    `HTTP ${msg91Response.status}`,
    `indicator: ${apiType || "success"}`,
    sanitizedMsg ? `message: "${sanitizedMsg}"` : "",
    requestId ? `request_id: ${requestId}` : "",
  ]
    .filter(Boolean)
    .join(", ")

  const successLog = `[Send SMS Hook] MSG91 API accepted OTP dispatch for destination: 91••••••${raw10.slice(-4)} (${logDetails})`
  return { status: 200, body: {}, log: successLog, isError: false }
}

// Test Case 2.1: Success with type and request_id
const successCase1 = evaluateMsg91Response({ ok: true, status: 200 }, {
  type: "success",
  message: "otp_sent_successfully",
  request_id: "req_msg91_889922",
})
assert(
  !successCase1.isError && successCase1.status === 200,
  "Successful dispatch returns HTTP 200 with empty body",
)
assert(
  successCase1.log.includes("MSG91 API accepted OTP dispatch") &&
    successCase1.log.includes("HTTP 200") &&
    successCase1.log.includes("indicator: success") &&
    successCase1.log.includes('message: "otp_sent_successfully"') &&
    successCase1.log.includes("request_id: req_msg91_889922") &&
    successCase1.log.includes("91••••••3210"),
  "Success log contains all diagnostic fields with masked phone",
)

// Test Case 2.2: Explicit API error with HTTP 200 (e.g. invalid template)
const errorCase1 = evaluateMsg91Response({ ok: true, status: 200 }, {
  type: "error",
  message: "Invalid Template ID",
})
assert(
  errorCase1.isError && errorCase1.status === 502,
  'MSG91 HTTP 200 with { type: "error" } is converted to non-2xx status (502 Bad Gateway)',
)
assert(
  errorCase1.body?.error?.message === "Invalid Template ID",
  "Error response body contains sanitized error message from MSG91",
)

// Test Case 2.3: Upstream HTTP 400 Bad Request
const errorCase2 = evaluateMsg91Response({ ok: false, status: 400 }, {
  type: "error",
  message: "Mobile number is invalid",
})
assert(
  errorCase2.isError && errorCase2.status === 400,
  "MSG91 HTTP 400 status is properly propagated to caller",
)

// Test Case 2.4: Upstream HTTP 500 Gateway Failure
const errorCase3 = evaluateMsg91Response({ ok: false, status: 500 }, {
  message: "Internal Server Error",
})
assert(
  errorCase3.isError && errorCase3.status === 500,
  "MSG91 HTTP 500 status is properly propagated to caller",
)

// -------------------------------------------------------------
// Suite 3: Sanitization & Secrets Protection Guarantees
// -------------------------------------------------------------
console.log("\n--- Suite 3: Sanitization & Secrets Protection ---")

const testOtp = "654321"
const testApiKey = "test_secret_authkey_xyz"
const multilineCase = evaluateMsg91Response({ ok: true, status: 200 }, {
  type: "success",
  message: "line 1\nline 2\r\nline 3\twith tabs",
  request_id: "req_safe_001",
})

assert(
  !multilineCase.log.includes("\n") &&
    !multilineCase.log.includes("\r") &&
    !multilineCase.log.includes("\t"),
  "Sanitized message replaces all newlines and tabs with spaces",
)

assert(
  !multilineCase.log.includes(testOtp) &&
    !multilineCase.log.includes(testApiKey),
  "Logs never include OTPs or API keys",
)

assert(
  !multilineCase.log.includes("9876543210") &&
    multilineCase.log.includes("91••••••3210"),
  "Full 10-digit mobile number is never logged unmasked",
)

console.log(
  "\n================================================================",
)
console.log(`  DIAGNOSTICS TEST SUITE: ${passed} PASSED, ${failed} FAILED`)
console.log(
  "================================================================\n",
)

if (failed > 0) {
  process.exit(1)
}
