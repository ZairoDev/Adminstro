"use client";
import { Suspense } from "react";
import WhatsAppChat from "./whatsapp";



export default function WhatsAppPage() {
	return (
    <Suspense>
      <WhatsAppChat  />
    </Suspense>
  );
}
