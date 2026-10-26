import type { Metadata } from "next";
import "@fontsource-variable/montserrat";
import "@fontsource-variable/lora";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: {
    default: "EcoHub",
    template: "%s | EcoHub",
  },
  description: "EcoHub is a community platform for people who care about the planet.",
  icons: { icon: "/logo.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
