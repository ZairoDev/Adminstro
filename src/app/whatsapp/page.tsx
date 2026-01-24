"use client";
import { Suspense } from "react";
import WhatsAppChat from "./whatsapp";

export default function WhatsAppPage() {
  return (
    <div className="h-screen w-screen md:h-[110dvh] md:w-[110.5dvw] overflow-hidden">
      <Suspense>
        <WhatsAppChat />
      </Suspense>
    </div>
  );
}
