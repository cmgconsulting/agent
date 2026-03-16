import type { Metadata } from "next"
import { Bai_Jamjuree } from "next/font/google"
import "./globals.css"

const baiJamjuree = Bai_Jamjuree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "CMG Agent - Vos agents IA au service de votre entreprise",
  description: "Plateforme simple et intuitive pour automatiser votre marketing, SEO et communication avec l'intelligence artificielle",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${baiJamjuree.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
