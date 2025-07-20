import { useCopilotAction } from "@turbo-agent/copilotkit-react-core";

useCopilotAction({
  name: "noargs",
  handler: async () => {
    console.log("No args action");
  },
});
