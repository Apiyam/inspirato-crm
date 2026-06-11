import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta name="description" content="Inspirato CRM — Gestión de conversaciones y contactos" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
