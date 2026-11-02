import type { Metadata } from "next";
import "@fontsource/sekuya/400.css";
import "@fontsource/hedvig-letters-serif/400.css";
import "@carrot-kpi/switzer-font/latin-400.css";
import "@carrot-kpi/switzer-font/latin-500.css";
import "@fontsource/fragment-mono/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tenor — Know when the market changes its mind",
  description:
    "Tenor watches rates, volatility and credit, and tells portfolio managers when the market moves into a new regime.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
