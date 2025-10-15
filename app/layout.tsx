import type { Metadata } from "next";
import { Providers } from "../components/Providers";
import "../styles/custom.css";
import "../styles/index.css";
import "../styles/App.css";

export const metadata: Metadata = {
  title: "AutoPlanCam",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
