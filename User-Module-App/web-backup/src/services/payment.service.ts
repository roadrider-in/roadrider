export interface PaymentMethodOption {
  id: number;
  type: "upi" | "card" | "netbanking" | "cod";
  name: string;
  sub: string;
  isAvailable: boolean;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 0, type: "upi", name: "UPI", sub: "Google Pay, PhonePe, Paytm", isAvailable: true },
  { id: 1, type: "card", name: "Credit or debit card", sub: "Visa, Mastercard, RuPay", isAvailable: true },
  { id: 2, type: "netbanking", name: "Netbanking", sub: "All Indian banks supported", isAvailable: true },
  { id: 3, type: "cod", name: "Cash on delivery", sub: "Pay cash at doorstep", isAvailable: true },
];

/**
 * Simulates secure server-side payment processing handshake
 */
export async function processPayment(
  amount: number,
  method: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  // In real backend, this communicates with payment gateway order verification
  await new Promise((r) => setTimeout(r, 600));

  return {
    success: true,
    transactionId: `TXN_${Date.now().toString(36).toUpperCase()}`,
  };
}
