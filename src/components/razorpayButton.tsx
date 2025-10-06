"use client";

import { useRazorpayLink } from "@/hooks/useRazorpay";


type Props = {
  amount: number;
  name: string;
  email: string;
  phone: string;
  description?: string;
};

export default function PaymentLinkButton({
  amount,
  name,
  email,
  phone,
  description,
}: Props) {
  const { createPaymentLink, link, loading, error } = useRazorpayLink();

  const handleClick = () => {

    createPaymentLink({ amount, name, email, phone, description });
  };        
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Creating Link..." : "Create Payment Link"}
      </button>

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 underline"
        >
          View Payment Link
        </a>
      )}

      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
