import { ReactNode } from "react";
import { CopilotKit } from "@think-copilotkit/react-core";
import "@think-copilotkit/react-ui/styles.css";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Make sure to use the URL you configured in the previous step  */}
        <CopilotKit runtimeUrl="/api/copilotkit" agent="quickstart_agent">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
