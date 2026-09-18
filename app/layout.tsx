import "./globals.css";

export const metadata = {
  title: "Lotus AI Fashion Mirror",
  description: "AI virtual clothing try-on kiosk",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d0d0d] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
