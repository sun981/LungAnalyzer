import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "Tumor Analysis | AI Radiological Assistant",
  description: "Analyze radiological images using Google Gemini API to predict tumor types.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <Script src="https://docs.opencv.org/4.8.0/opencv.js" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  );
}
