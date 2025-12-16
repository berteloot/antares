import type { Metadata } from 'next'
import { Exo_2, Roboto } from 'next/font/google'
import Image from 'next/image'
import './globals.css'

const exo2 = Exo_2({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-exo',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
})

const roboto = Roboto({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
  weight: ['300', '400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'ROI Calculator | Antares Vision Group',
  description: 'Compare disposable vs returnable packaging ROI to make informed decisions about your supply chain investments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${exo2.variable} ${roboto.variable}`}>
      <body className={`${roboto.className} antialiased flex flex-col min-h-screen`}>
        {/* Persistent Header */}
        <header className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 sm:h-20 items-center justify-start">
              <a 
                href="https://antaresvisiongroup.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="relative w-full max-w-[180px] sm:max-w-[220px] md:max-w-[250px] h-auto transition-opacity hover:opacity-80"
                aria-label="Visit Antares Vision Group website"
              >
                <Image
                  src="/antares-main-logo-470x99.webp"
                  alt="Antares Vision Group"
                  width={470}
                  height={99}
                  priority
                  className="w-full h-auto object-contain"
                />
              </a>
            </div>
          </div>
        </header>
        <div className="flex-1">
          {children}
        </div>
        {/* Footer */}
        <footer className="w-full border-t border-primary/20 bg-background mt-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
              <div className="text-center sm:text-left">
                <p>© {new Date().getFullYear()} Antares Vision Group. All rights reserved.</p>
              </div>
              <div className="text-center sm:text-right">
                <p>
                  ROI Calculator developed by{' '}
                  <a
                    href="https://www.nytromarketing.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 font-medium transition-colors underline underline-offset-4"
                  >
                    Nytro Marketing
                  </a>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
