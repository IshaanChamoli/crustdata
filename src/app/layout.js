import "./globals.css";

export const metadata = {
  title: "CrustBot",
  description: "Your AI-powered coding assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
