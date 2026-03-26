import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fexel Advisor',
  description: 'AI-powered automation advisor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
