import "~/styles/globals.css";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import Footer from "~/components/Footer";
import Navigation from "~/components/Navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "PrepTrac - Preparedness Inventory",
  description: "Track your preparedness inventory and supplies",
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
          <div className="flex h-screen overflow-hidden">
            <Navigation />
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <div className="flex-1 overflow-y-auto">
                {children}
                <Footer />
              </div>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}

