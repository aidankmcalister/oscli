import { RootProvider } from "fumadocs-ui/provider/next";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import "./global.css";
import { Fraunces, Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://github.com/aidankmcalister/oscli"),
  title: "oscli docs",
  description: "Documentation for oscli, a Bun-first TypeScript CLI framework.",
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-fd-background font-sans text-fd-foreground">
        <Analytics />
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
