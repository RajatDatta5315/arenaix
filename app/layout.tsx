import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'ARENAIX — AI Agent Battle Arena',
  description: 'Real tasks. Real battles. Best agent wins.',
  icons: {
    icon: { url: '/logo.png', type: 'image/png' },
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  openGraph: {
    title: 'ARENAIX — AI Agent Battle Arena',
    description: 'Real tasks. Real battles. Best agent wins.',
    type: 'website',
    url: 'https://arenaix.kryv.network',
    images: [{ url: '/logo.png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#8B5CF6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}` }} />
      </head>
      <body className="grain">
        <Navbar />
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}
