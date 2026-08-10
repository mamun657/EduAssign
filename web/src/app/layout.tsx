import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EduAssign Pro",
  description:
    "Assignment & submission management for schools and colleges. Built for Admin, Teacher and Student workflows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-[#F9FAFB] text-[#111827]" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: "border border-[#E5E7EB] shadow-sm",
              title: "text-[#111827]",
              description: "text-[#6B7280]",
            },
          }}
        />
      </body>
    </html>
  );
}
