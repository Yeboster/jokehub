
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import Navbar from '@/components/navbar';
import { JokeProvider } from '@/contexts/JokeContext';
import { AuthProvider } from '@/contexts/AuthContext'; // Import AuthProvider

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
        <AuthProvider> {/* Wrap with AuthProvider */}
          <JokeProvider>
            <Navbar />
            <main className="flex-grow">
               {children}
            </main>
            <Toaster />
          </JokeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
