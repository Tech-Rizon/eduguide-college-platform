import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";


export const metadata: Metadata = {
  title: "EduGuide - Your College Journey Starts Here",
  description: "Get personalized guidance, discover the perfect college, and chat with our AI assistant to navigate your educational future with confidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="font-sans antialiased"
      >
        {children}
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
