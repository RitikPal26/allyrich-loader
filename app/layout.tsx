import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spline 3D Interactive Screen",
  description: "Interactive 3D screen built with Spline and Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased w-full h-full overflow-hidden bg-neutral-950">
        {children}
      </body>
    </html>
  );
}
