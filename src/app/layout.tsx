import "~/styles/globals.css";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import Footer from "~/components/Footer";

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
      <body className={`font-sans ${inter.variable} flex min-h-screen flex-col`}>
        <div className="flex-1">
          <Providers>{children}</Providers>
        </div>
        <Footer />
      </body>
    </html>
  );
}

