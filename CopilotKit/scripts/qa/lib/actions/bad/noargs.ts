import { useCopilotAction } from "@think-copilotkit/react-core";

useCopilotAction({
  name: "noargs",
  handler: async (args) => {
    console.log("No args action");
  },
});
