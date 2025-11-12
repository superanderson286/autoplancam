import type { Metadata } from "next";
import { Providers } from "../components/Providers";
import { FirebaseAnalyticsProvider } from "../components/FirebaseAnalyticsProvider";
import ErrorBoundary from "../components/ErrorBoundary";
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
    <html lang="en" className="overflow-x-hidden">
      <body className="overflow-x-hidden">
        <Providers>
          <FirebaseAnalyticsProvider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </FirebaseAnalyticsProvider>
        </Providers>
      </body>
    </html>
  );
}
