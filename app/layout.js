import { Playfair_Display, Sarabun } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const sarabun = Sarabun({ subsets: ["latin", "thai"], weight: ["100", "200", "300", "400", "500", "600", "700", "800"], variable: "--font-sarabun" });

export const metadata = {
  title: "LungCare - Advanced Radiomics Workstation",
  description: "Minimalist Healthcare Radiomics and Gemini AI API to predict tumor types.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${sarabun.variable}`}>
      <head>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
      </head>
      <body className="font-sarabun text-foreground bg-background">{children}</body>
    </html>
  );
}
