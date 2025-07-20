"use client";
import { CopilotKit, useCopilotAction, useCopilotReadable } from "@turbo-agent/copilotkit-react-core";
import { CopilotTextarea } from "@turbo-agent/copilotkit-react-textarea";
import { CopilotSidebar } from "@turbo-agent/copilotkit-react-ui";
import "@turbo-agent/copilotkit-react-ui/styles.css";
import { useState } from "react";
import "@turbo-agent/copilotkit-react-textarea/styles.css";
import "@turbo-agent/copilotkit-react-ui/styles.css";
function InsideHome() {
  const [message, setMessage] = useState("Hello World!");
  const [text, setText] = useState("");
  useCopilotReadable({
    description: "This is the current message",
    value: message,
  });
  useCopilotAction(
    {
      name: "displayMessage",
      description: "Display a message.",
      parameters: [
        {
          name: "message",
          type: "string",
          description: "The message to display.",
          required: true,
        },
      ],
      handler: async ({ message }) => {
        setMessage(message);
      },
    },
    [],
  );
  return (
    <>
      <div>{message}</div>
    </>
  );
}
export default function Home() {
  return (
    <CopilotKit url="http://localhost:4000" properties={{ userId: "xyz" }}>
      <CopilotSidebar
        defaultOpen={true}
        labels={{
          title: "Presentation Copilot",
          initial: "Hi you! 👋 I can give you a presentation on any topic.",
        }}
      >
        <InsideHome />
      </CopilotSidebar>
    </CopilotKit>
  );
}
