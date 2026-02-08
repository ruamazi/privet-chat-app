import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LanguageProvider } from "@/hooks/LanguageContext";

const jetbrainMono = JetBrains_Mono({
 variable: "--font-jetbrains-mono",
 subsets: ["latin"],
});

export const metadata: Metadata = {
 title: "Privet chat app",
 description: "Secure chat app",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
  <html lang="en">
   <body className={`${jetbrainMono.variable} antialiased`}>
    <LanguageProvider>
     <Providers>{children}</Providers>
    </LanguageProvider>
   </body>
  </html>
 );
}
