import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/fredoka';
import './globals.css';
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#eaf3ef',
};
export const metadata: Metadata = {
  title: 'Gravi · Un bosque por despertar',
  description:
    'Ayuda a Gravi a despertar los diez sakuras de su pequeño planeta jugando con la gravedad.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
