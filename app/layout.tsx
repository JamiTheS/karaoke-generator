import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
