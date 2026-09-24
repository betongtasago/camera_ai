import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { Analytics } from '@vercel/analytics/next'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'TSG-TNT AI - Giám sát Camera IP & Nhận diện Biển số Xe AI',
  description:
    'Hệ thống giám sát camera IP thông minh, AI tự động nhận dạng xe di chuyển từ xa lại gần, phóng to zoom biển số (LPR/ANPR), đối soát danh mục xe (biển số, tài xế, loại xe) và cảnh báo theo thời gian thực.',
  openGraph: {
    title: 'TSG-TNT AI - Giám sát Camera IP & Nhận diện Biển số Xe AI',
    description:
      'Hệ thống giám sát camera IP thông minh, AI tự động nhận dạng xe di chuyển từ xa lại gần, phóng to zoom biển số (LPR/ANPR), đối soát danh mục xe (biển số, tài xế, loại xe) và cảnh báo theo thời gian thực.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
