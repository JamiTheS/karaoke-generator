import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  variable: "--font-serif",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Instant Karaoke - Sing Any Song",
  description:
    "Search for any song and instantly get a karaoke experience with synchronized lyrics.",
  openGraph: {
    title: "Instant Karaoke",
    description: "Search for any song and sing along with synchronized lyrics",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${instrumentSerif.variable} ${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
