import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Formly — Interactive Forms",
  description: "Build forms, publish links, and collect responses through a conversational widget."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
