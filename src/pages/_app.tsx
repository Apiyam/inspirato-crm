import type { AppProps } from "next/app";
import { CssVarsProvider } from "@mui/joy/styles";
import CssBaseline from "@mui/joy/CssBaseline";
import { AuthProvider } from "../providers/AuthProvider";
import { crmTheme } from "../utils/theme";
import "../App.css";

function ApiyamApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <CssVarsProvider theme={crmTheme} disableTransitionOnChange defaultColorScheme="light">
        <CssBaseline />
        <Component {...pageProps} />
      </CssVarsProvider>
    </AuthProvider>
  );
}

export default ApiyamApp;