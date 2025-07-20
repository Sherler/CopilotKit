"use client";

import { CopilotKit } from "@turbo-agent/copilotkit-react-core";
import { Mailer } from "./Mailer";
import "@turbo-agent/copilotkit-react-ui/styles.css";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between">
      <CopilotKit runtimeUrl="/api/copilotkit" agent="email_agent">
        <Mailer />
      </CopilotKit>
    </main>
  );
}
