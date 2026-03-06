import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import LiveSupportWidget from "@/components/LiveSupportWidget";

export const metadata: Metadata = {
  title: "EduGuide - Your College Journey Starts Here",
  description: "Get personalized AI-powered college guidance, discover the perfect college based on your GPA and goals, and navigate your educational future with confidence.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">
        {children}
        <LiveSupportWidget />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              style: {
                background: "#22c55e",
              },
            },
            error: {
              duration: 4000,
              style: {
                background: "#ef4444",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
