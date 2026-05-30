import type { Metadata } from "next";
import { Playfair_Display, Open_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair' });
const openSans = Open_Sans({ subsets: ["latin"], variable: '--font-open-sans' });

export const metadata: Metadata = {
  title: "Colegio Las Palmas – Sistema Financiero",
  description: "Gestión financiera del colegio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${playfair.variable} ${openSans.variable}`}>
        {children}
      </body>
    </html>
  );
}