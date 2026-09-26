import './globals.css';
import { AuthProvider } from '../lib/AuthContext';

export const metadata = {
  title: 'NollywoodVideo — stream the best of Nollywood',
  description:
    'NollywoodVideo is a licensed distribution platform for Nollywood cinema: browse a curated catalogue, stream feature films and shorts, keep a personal watchlist and share star reviews.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#12100d',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="app-body">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}