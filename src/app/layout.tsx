import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import favicon from './favicon.png';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Remove background from image",
  description: "Removes background from images, completely from client-side.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
      <link rel="icon" href={favicon.src} sizes="any" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
