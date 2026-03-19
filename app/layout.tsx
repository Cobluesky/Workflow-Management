import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./Providers"; // 🌟 추가
import Navbar from "./Navbar";       // 🌟 추가

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Timetable",
  description: "개인 워크플로우 관리",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-50 text-gray-900`} suppressHydrationWarning>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}