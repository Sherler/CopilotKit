import "../styles/globals.css";
import "@turbo-agent/copilotkit-react-ui/styles.css";
import "@turbo-agent/copilotkit-react-textarea/styles.css";
import { ServiceAdapterSelector } from "./components/ServiceAdapterSelector";
import { Suspense } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-zinc-900">
      <body>
        <Suspense fallback={<div>Loading...</div>}>
          {children}
          <ServiceAdapterSelector />
        </Suspense>
      </body>
    </html>
  );
}
