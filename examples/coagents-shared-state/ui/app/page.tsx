"use client";

import { CopilotKit } from "@turbo-agent/copilotkit-react-core";
import { Translator } from "./Translator";
import "@turbo-agent/copilotkit-react-ui/styles.css";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between">
      <CopilotKit runtimeUrl="/api/copilotkit" agent="translate_agent">
        <Translator />
      </CopilotKit>
    </main>
  );
}
