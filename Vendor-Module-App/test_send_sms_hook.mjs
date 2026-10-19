import crypto from "crypto"

const HOOK_URL =
  "https://sjahblquggmzlihqgzyt.supabase.co/functions/v1/send-sms-hook"

async function testSendSmsHook() {
  console.log(
    "================================================================",
  )
  console.log("  TESTING SEND SMS HOOK ENDPOINT & CONTRACT COMPLIANCE         ")
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

  // 1. CORS Preflight
  console.log("--- Test 1: CORS OPTIONS Preflight ---")
  const corsRes = await fetch(HOOK_URL, { method: "OPTIONS" })
  assert(
    corsRes.status === 200,
    "OPTIONS preflight returns HTTP 200 OK",
    `Status: ${corsRes.status}`,
  )
  assert(
    corsRes.headers.get("access-control-allow-origin") === "*",
    'CORS header Access-Control-Allow-Origin is "*"',
  )
  const allowHeaders = corsRes.headers.get("access-control-allow-headers") || ""
  assert(
    allowHeaders.includes("webhook-signature") &&
      allowHeaders.includes("webhook-id"),
    "CORS header includes webhook signature headers",
  )

  // 2. Reject Non-POST Methods
  console.log("\n--- Test 2: Reject Non-POST Methods (GET, PUT) ---")
  const getRes = await fetch(HOOK_URL, { method: "GET" })
  const getData = await getRes.json()
  assert(
    getRes.status === 405 &&
      getData?.error?.message?.includes("Method not allowed"),
    "GET request returns HTTP 405 with standard error format",
    `Status: ${getRes.status}, Body: ${JSON.stringify(getData)}`,
  )

  // 3. Reject Unauthenticated / Missing Webhook Signature
  console.log("\n--- Test 3: Reject Unsigned Request (401 Unauthorized) ---")
  const unsignedRes = await fetch(HOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  const unsignedData = await unsignedRes.json()
  assert(
    unsignedRes.status === 401 &&
      unsignedData?.error?.message?.includes("signature"),
    "Unsigned request is strictly rejected with HTTP 401 Unauthorized",
    `Status: ${unsignedRes.status}, Body: ${JSON.stringify(unsignedData)}`,
  )

  // Helper to generate valid Svix signature headers for testing payload rules
  const secretKey =
    "v1,whsec_TekoiQCqjaW0DPLFc/Uan0QNvN1Gz4OvVY1MO7sLQ+aD6q4X2X8Lfko7rMMdzgtNHLGsIvy6JlZRlVj9"
  let cleanSec = secretKey.trim()
  if (cleanSec.startsWith("v1,")) cleanSec = cleanSec.slice(3).trim()
  if (cleanSec.startsWith("whsec_")) cleanSec = cleanSec.slice(6).trim()
  const rawKeyBytes = Buffer.from(cleanSec, "base64")

  function getSignedHeaders(bodyStr) {
    const msgId = "msg_" + Date.now()
    const ts = String(Math.floor(Date.now() / 1000))
    const toSign = `${msgId}.${ts}.${bodyStr}`
    const sig = crypto
      .createHmac("sha256", rawKeyBytes)
      .update(toSign)
      .digest("base64")
    return {
      "Content-Type": "application/json",
      "webhook-id": msgId,
      "webhook-timestamp": ts,
      "webhook-signature": `v1,${sig}`,
    }
  }

  // 4. Reject Invalid Signature
  console.log(
    "\n--- Test 4: Reject Invalid Webhook Signature (401 Unauthorized) ---",
  )
  const badSigRes = await fetch(HOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "webhook-id": "msg_test_invalid",
      "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
      "webhook-signature": "v1,forged_or_invalid_signature_bytes==",
    },
    body: JSON.stringify({
      user: { phone: "+919876543210" },
      sms: { otp: "123456" },
    }),
  })
  const badSigData = await badSigRes.json()
  assert(
    badSigRes.status === 401 &&
      badSigData?.error?.message?.includes("signature"),
    "Forged or invalid signature is rejected with HTTP 401 Unauthorized",
    `Status: ${badSigRes.status}, Body: ${JSON.stringify(badSigData)}`,
  )

  // 5. Reject Empty Payload with Valid Signature
  console.log("\n--- Test 5: Reject Missing Body with Valid Signature ---")
  const emptyBody = JSON.stringify({})
  const emptyRes = await fetch(HOOK_URL, {
    method: "POST",
    headers: getSignedHeaders(emptyBody),
    body: emptyBody,
  })
  const emptyData = await emptyRes.json()
  assert(
    emptyRes.status === 400 &&
      emptyData?.error?.message?.includes(
        "Both user.phone and sms.otp are required",
      ),
    "Signed empty body returns HTTP 400 with standard error format",
    `Status: ${emptyRes.status}, Body: ${JSON.stringify(emptyData)}`,
  )

  // 6. Reject Missing Phone with Valid Signature
  console.log(
    "\n--- Test 6: Reject Missing user.phone with Valid Signature ---",
  )
  const noPhoneBody = JSON.stringify({ sms: { otp: "123456" } })
  const noPhoneRes = await fetch(HOOK_URL, {
    method: "POST",
    headers: getSignedHeaders(noPhoneBody),
    body: noPhoneBody,
  })
  const noPhoneData = await noPhoneRes.json()
  assert(
    noPhoneRes.status === 400 &&
      noPhoneData?.error?.message?.includes(
        "Both user.phone and sms.otp are required",
      ),
    "Signed missing phone returns HTTP 400 with standard error format",
  )

  // 7. Reject Invalid Indian Phone with Valid Signature
  console.log(
    "\n--- Test 7: Reject Invalid Indian Phone with Valid Signature ---",
  )
  const invalidPhoneBody = JSON.stringify({
    user: { phone: "+1234567890" },
    sms: { otp: "123456" },
  })
  const invalidPhoneRes = await fetch(HOOK_URL, {
    method: "POST",
    headers: getSignedHeaders(invalidPhoneBody),
    body: invalidPhoneBody,
  })
  const invalidPhoneData = await invalidPhoneRes.json()
  assert(
    invalidPhoneRes.status === 400 &&
      invalidPhoneData?.error?.message?.includes(
        "Invalid Indian mobile number",
      ),
    "Signed non-Indian / invalid phone returns HTTP 400 with standard error format",
    `Status: ${invalidPhoneRes.status}, Body: ${JSON.stringify(invalidPhoneData)}`,
  )

  console.log(
    "\n================================================================",
  )
  console.log(`  SEND SMS HOOK TEST SUITE: ${passed} PASSED, ${failed} FAILED`)
  console.log(
    "================================================================\n",
  )

  if (failed > 0) {
    process.exit(1)
  }
}

testSendSmsHook().catch((err) => {
  console.error("Fatal send-sms-hook test failure:", err)
  process.exit(1)
})
