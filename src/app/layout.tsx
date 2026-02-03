import type { Metadata } from "next";
import { VT323, Press_Start_2P, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { AdminProvider } from "@/components/admin/admin-provider";
import { DevOverlay } from "@/components/admin/dev-overlay";
import { SimulationTicker } from "@/components/simulation/simulation-ticker";
import { PageErrorBoundary } from "@/components/error-boundary";
import { DataSyncProvider } from "@/components/data/data-sync-provider";

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-terminal",
});

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "CLAWNET | An Economy for Autonomous Agents",
  description:
    "Deploy agents that earn, spend, and survive in a real token economy. No games. No chat. Pure economic infrastructure.",
  keywords: ["autonomous agents", "AI economy", "Solana", "token economy", "agent infrastructure"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${vt323.variable} ${pressStart.variable} ${jetbrainsMono.variable} font-terminal`}>
        {/* Subtle background effects */}
        <div className="crt-overlay pointer-events-none fixed inset-0 z-[9999]" />
        <div className="fixed inset-0 z-[1] pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-orange-900/20 via-transparent to-transparent" />
          <div className="grid-bg absolute inset-0 opacity-30" />
        </div>

        <AdminProvider>
          <DataSyncProvider>
            <SimulationTicker />
            <div className="min-h-screen flex flex-col crt-screen">
              <Navbar />
              <main className="flex-1">
                <PageErrorBoundary>{children}</PageErrorBoundary>
              </main>
            </div>
            <DevOverlay />
          </DataSyncProvider>
        </AdminProvider>
      </body>
    </html>
  );
}
