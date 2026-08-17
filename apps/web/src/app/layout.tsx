import type { Metadata } from 'next';
import './globals.css';
import ConditionalLayout from '@/components/ConditionalLayout';

export const metadata: Metadata = {
  title: 'WhiteGator — Production AI Infrastructure & Gateway',
  description:
    'Enterprise-grade AI gateway platform providing unified LLM access, virtual key governance, latency routing, guardrails, and real-time cost control.',
  keywords: ['AI gateway', 'LLM proxy', 'OpenAI', 'Anthropic', 'cost control', 'rate limiting'],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;1,14..32,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: 'var(--color-paper-white)' }}>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
