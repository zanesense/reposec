import type { Metadata } from "next";
import { Caveat, Geist_Mono, Quicksand } from "next/font/google";
import { Toaster } from "sonner";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepoSec \u2014 GitHub repo security report",
  description:
    "RepoSec scans any public GitHub repo for security hygiene: exposed .env files, hardcoded secrets, missing SECURITY.md, weak .gitignore, container and CI misconfigurations, and more. Read-only, no auth, no installs.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "RepoSec",
    description:
      "Find security gaps in your GitHub repo before attackers do.",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${caveat.variable} ${quicksand.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col text-foreground">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster
          theme="light"
          position="bottom-right"
          richColors
          toastOptions={{
            classNames: {
              toast:
                "border-2 border-ink bg-card text-foreground shadow-[4px_4px_0_0_#1a1a1a] rounded-xl",
            },
          }}
        />
      </body>
    </html>
  );
}
