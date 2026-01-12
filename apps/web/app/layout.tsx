export const metadata = {
  title: 'Tuvi AI',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: 'system-ui', margin: 0, padding: 24 }}>{children}</body>
    </html>
  );
}
