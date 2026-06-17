import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title:       "EMNIST Recogniser",
  description: "Handwritten character recognition — 47 classes, EMNIST Balanced dataset",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent flash of unstyled dark mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem("emnist-dark-mode");
                if (saved === "true") document.documentElement.classList.add("dark");
              } catch {}
            `,
          }}
        />
      </head>
      <body className="bg-gh-canvas dark:bg-dark-canvas text-gh-fg dark:text-dark-fg antialiased transition-colors duration-200">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--toast-bg, #ffffff)",
              color:      "var(--toast-fg, #1f2328)",
              border:     "1px solid #d0d7de",
              borderRadius: "6px",
              fontSize:   "14px",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
            success: { duration: 3000 },
            error:   { duration: 4000 },
          }}
        />
      </body>
    </html>
  );
}
