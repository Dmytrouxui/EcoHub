import type { Metadata } from "next";
import { MessagePage } from "@/components/MessagePage";

export const metadata: Metadata = { title: "Coming soon" };

export default function ComingSoonPage() {
  return <MessagePage title="Coming soon">We’re still growing this part of EcoHub. Check back shortly!</MessagePage>;
}
