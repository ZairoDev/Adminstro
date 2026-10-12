/**
 * Pure, side-effect-free math functions for Finance invoice classification.
 * All functions are unit-testable without any DB or external dependencies.
 */

/** Allowed floating-point rounding tolerance when comparing amounts (₹1) */
export const AMOUNT_TOLERANCE = 1;

export type CompleteAdjustment = {
  discountGiven: number;
  newAmountDue: number;
  isOverpayment: boolean;
  overpaymentAmount: number;
};

/**
 * Compute the discount (or overpayment) when a "complete" payment is received.
 *
 * - paidAmount < amountDue  → discount is given; lower amountDue to paidAmount.
 * - paidAmount ≈ amountDue  → no adjustment needed (within tolerance).
 * - paidAmount > amountDue  → overpayment; amountDue stays at original.
 */
export function computeCompleteAdjustment(
  amountDue: number,
  paidAmount: number,
): CompleteAdjustment {
  const diff = amountDue - paidAmount;

  if (diff > AMOUNT_TOLERANCE) {
    // Customer paid less — discount given
    return {
      discountGiven: diff,
      newAmountDue: paidAmount,
      isOverpayment: false,
      overpaymentAmount: 0,
    };
  }

  if (diff < -AMOUNT_TOLERANCE) {
    // Customer paid more — overpayment
    return {
      discountGiven: 0,
      newAmountDue: amountDue,
      isOverpayment: true,
      overpaymentAmount: Math.abs(diff),
    };
  }

  // Within tolerance — exact match
  return {
    discountGiven: 0,
    newAmountDue: amountDue,
    isOverpayment: false,
    overpaymentAmount: 0,
  };
}

/**
 * Compute the pending amount for a partial payment.
 *
 * @param amountDue  - Guest's current amountDue on the booking.
 * @param amountPaid - Guest's total amountPaid after adding this payment.
 */
export function computePendingAmount(amountDue: number, amountPaid: number): number {
  const pending = amountDue - amountPaid;
  return Math.max(0, pending);
}

export type SplitAllocationInput = {
  guestId?: string;
  name?: string;
  email?: string;
  phone?: string;
  amount: number;
};

export type SplitValidationResult = {
  valid: boolean;
  difference: number;
  message?: string;
};

/**
 * Validate that split allocations sum approximately to the total payment amount.
 *
 * Returns `valid: true` if the sum is within AMOUNT_TOLERANCE of totalAmount.
 */
export function validateSplitAllocations(
  allocations: SplitAllocationInput[],
  totalAmount: number,
): SplitValidationResult {
  if (allocations.length < 2) {
    return { valid: false, difference: 0, message: "Split requires at least 2 allocations" };
  }

  const sum = allocations.reduce((acc, a) => acc + a.amount, 0);
  const difference = Math.abs(sum - totalAmount);

  if (difference > AMOUNT_TOLERANCE) {
    return {
      valid: false,
      difference,
      message: `Allocation sum (${sum}) differs from payment amount (${totalAmount}) by ₹${difference.toFixed(2)}`,
    };
  }

  return { valid: true, difference };
}
