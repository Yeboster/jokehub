import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Navbar from '@/components/navbar'; // Import Navbar
import { JokeProvider } from '@/contexts/JokeContext'; // Import JokeProvider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Joke Hub',
  description: 'Manage and filter your jokes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}>
        <JokeProvider> {/* Wrap with JokeProvider */}
          <Navbar /> {/* Add Navbar */}
          <main className="flex-grow">
             {children}
          </main>
          <Toaster />
        </JokeProvider>
      </body>
    </html>
  );
}
