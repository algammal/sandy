import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider, ToastProvider } from "@sandy/ui";
import { StoreProvider } from "../store/StoreProvider";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Client Portal — Voice Agent Platform",
  description: "Manage your business profile, properties and compounds for your AI voice agent.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <StoreProvider>
            <ToastProvider>{children}</ToastProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
