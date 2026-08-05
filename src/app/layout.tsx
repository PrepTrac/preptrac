import "~/styles/globals.css";
import { Inter } from "next/font/google";
import type { Viewport } from "next";
import { Providers } from "./providers";
import Footer from "~/components/Footer";
import Navigation from "~/components/Navigation";
import ServiceWorkerRegister from "~/components/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "PrepTrac - Preparedness Inventory",
  description: "Track your preparedness inventory and supplies",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PrepTrac",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${inter.variable} min-h-screen bg-gray-50 dark:bg-gray-900`}>
        <Providers>
          <ServiceWorkerRegister />
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
          >
            Skip to content
          </a>
          <div className="flex h-screen overflow-hidden">
            <Navigation />
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <div
                id="main-content"
                tabIndex={-1}
                className="flex-1 overflow-y-auto outline-none bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex min-h-full flex-col">
                  {children}
                  <Footer />
                </div>
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

