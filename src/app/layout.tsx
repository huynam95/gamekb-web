import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { ThemeController } from "@/components/ThemeController";
import { NotificationProvider } from "@/components/NotificationCenter";

// Inter ships a Vietnamese subset, so titles and notes with diacritics render in
// the same face as the rest of the UI instead of falling back mid-word.
const appSans = Inter({
  variable: "--font-app-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

const appMono = Geist_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
  display: "swap",
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
        className={`${appSans.variable} ${appMono.variable} font-sans antialiased`}
      >
        <NotificationProvider>
          <ThemeController />
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
