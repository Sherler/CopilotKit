import { useCopilotAction } from "@turbo-agent/copilotkit-react-core";

useCopilotAction({
  name: "noargs",
  handler: async (args) => {
    console.log("No args action");
  },
});
