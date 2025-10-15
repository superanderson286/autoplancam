import '../styles/index.css';
import '../styles/App.css';
import '../styles/custom.css';
import type { AppProps } from 'next/app';
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n"; // Ajusta la ruta según tu estructura

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <I18nextProvider i18n={i18n}>
      <Component {...pageProps} />
    </I18nextProvider>
  );
}

export default MyApp;
