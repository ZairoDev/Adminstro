"use client";
import { Suspense } from "react";
import WhatsAppChat from "./whatsapp";

export default function WhatsAppPage() {
  return (
    <div className="h-[110dvh] w-[110.5dvw] overflow-hidden">
      <Suspense>
        <WhatsAppChat />
      </Suspense>
    </div>
  );
}
