"use client";

import { CopilotKit } from "@think-copilotkit/react-core";
import { WaitForUserInput } from "./WaitForUserInput";
import "@think-copilotkit/react-ui/styles.css";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between">
      <CopilotKit runtimeUrl="/api/copilotkit" agent="weather_agent">
        <WaitForUserInput />
      </CopilotKit>
    </main>
  );
}
