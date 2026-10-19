/**
 * RoadRider Vendor Portal - MSG91 Secure OTP Widget Web SDK Integration
 *
 * Widget ID: 366a6c6b6d65333334323839
 * Client Token Auth: 576203TcQGlCUcljSo6acd087eP1
 *
 * NOTE: The server-side MSG91 Account Auth Key is NEVER exposed here.
 * This file uses the dedicated client tokenAuth for the Web SDK.
 */

export const MSG91_WIDGET_CONFIG = {
  widgetId: "366a6c6b6d65333334323839",
  tokenAuth: "576203TcQGlCUcljSo6acd087eP1",
}

const SDK_URLS = [
  "https://verify.msg91.com/otp-provider.js",
  "https://verify.phone91.com/otp-provider.js",
]

/**
 * Dynamically loads the MSG91 OTP script if not already present on window.
 */
export function loadMsg91Script() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      return reject(new Error("Window object is not available."))
    }

    if (typeof window.initSendOTP === "function") {
      return resolve(window.initSendOTP)
    }

    let i = 0
    function attempt() {
      // Check if already injected
      const existingScript = document.querySelector(
        `script[src="${SDK_URLS[i]}"]`,
      )
      if (existingScript) {
        existingScript.onload = () => {
          if (typeof window.initSendOTP === "function") {
            resolve(window.initSendOTP)
          } else {
            reject(new Error("initSendOTP not available on window."))
          }
        }
        return
      }

      const script = document.createElement("script")
      script.type = "text/javascript"
      script.src = SDK_URLS[i]
      script.async = true

      script.onload = () => {
        if (typeof window.initSendOTP === "function") {
          resolve(window.initSendOTP)
        } else {
          i++
          if (i < SDK_URLS.length) {
            attempt()
          } else {
            reject(
              new Error("initSendOTP function not found after script load."),
            )
          }
        }
      }

      script.onerror = () => {
        i++
        if (i < SDK_URLS.length) {
          attempt()
        } else {
          reject(new Error("Failed to load MSG91 OTP Web SDK scripts."))
        }
      }

      document.head.appendChild(script)
    }

    attempt()
  })
}

/**
 * Opens the MSG91 Secure OTP Widget (Default Web SDK UI)
 *
 * @param {Object} options
 * @param {string} options.phone - Clean 10-digit Indian phone number
 * @param {Function} options.onSuccess - Callback receiving verified token / data
 * @param {Function} options.onFailure - Callback receiving error
 */
export async function openMsg91Widget({ phone, onSuccess, onFailure }) {
  try {
    await loadMsg91Script()

    let identifier = undefined
    if (phone) {
      let cleanDigits = String(phone).replace(/\D/g, "")
      if (cleanDigits.startsWith("0")) cleanDigits = cleanDigits.substring(1)
      if (cleanDigits.length === 12 && cleanDigits.startsWith("91"))
        cleanDigits = cleanDigits.substring(2)
      if (cleanDigits.length === 10) {
        identifier = `91${cleanDigits}`
      }
    }

    const configuration = {
      widgetId: MSG91_WIDGET_CONFIG.widgetId,
      tokenAuth: MSG91_WIDGET_CONFIG.tokenAuth,
      ...(identifier ? { identifier } : {}),
      success: (data) => {
        console.log("[MSG91 OTP Widget] Verification success:", data)
        if (typeof onSuccess === "function") {
          onSuccess(data)
        }
      },
      failure: (error) => {
        console.warn("[MSG91 OTP Widget] Verification failure:", error)
        if (typeof onFailure === "function") {
          onFailure(error)
        }
      },
    }

    if (typeof window.initSendOTP === "function") {
      window.initSendOTP(configuration)
    } else {
      throw new Error("MSG91 initSendOTP is not initialized.")
    }
  } catch (err) {
    console.error("[MSG91 OTP Widget Error]", err)
    if (typeof onFailure === "function") {
      onFailure(err)
    }
    throw err
  }
}
