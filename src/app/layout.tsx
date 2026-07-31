import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MainShell } from "@/components/MainShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NovaMart",
  description: "A dark-themed e-commerce experience built with Next.js and Unsplash",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MainShell>{children}</MainShell>
        {/*
          Anchor for the CleverTap Web Inbox. The id must match the "Element ID"
          configured in the CleverTap dashboard (currently `clevertap-web-inbox`).
          The SDK resolves it once, when <ct-web-inbox> is attached, and never
          retries — so it has to live outside the auth-gated shell.
        */}
        <div id="clevertap-web-inbox" />
      </body>
    </html>
  );
}
