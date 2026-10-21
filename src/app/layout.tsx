import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeController } from "@/components/ThemeController";
import { NotificationProvider } from "@/components/NotificationCenter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GameKB",
  description: "Gaming idea database for NinjaPlay",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `
(function () {
  try {
    var savedTheme = localStorage.getItem('gamekb-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var shouldUseDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', shouldUseDark);
  } catch (error) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NotificationProvider>
          <ThemeController />
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
