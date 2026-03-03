import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "ContentBrain — AI-Powered LinkedIn Content Strategy",
    template: "%s | ContentBrain",
  },
  description:
    "Analyze your LinkedIn voice, generate posts that sound like you, schedule content, and grow your audience — all powered by AI.",
  keywords: [
    "LinkedIn",
    "content strategy",
    "AI writing",
    "personal branding",
    "social media",
    "content calendar",
    "engagement analytics",
  ],
  authors: [{ name: "ContentBrain" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ContentBrain",
    title: "ContentBrain — AI-Powered LinkedIn Content Strategy",
    description:
      "Analyze your voice, generate posts, and grow your LinkedIn audience with AI.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ContentBrain — AI-Powered LinkedIn Content Strategy",
    description:
      "Analyze your voice, generate posts, and grow your LinkedIn audience with AI.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
