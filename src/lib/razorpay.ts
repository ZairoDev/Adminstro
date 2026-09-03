import Razorpay from "razorpay";

export function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_API_KEY?.trim();
  const keySecret = process.env.RAZORPAY_API_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Missing RAZORPAY_API_KEY or RAZORPAY_API_SECRET");
  }
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/** @deprecated Prefer getRazorpayClient() so keys are read after env load. */
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY!,
  key_secret: process.env.RAZORPAY_API_SECRET!,
});
