import { useCopilotContext } from "../context";
import React, { useCallback } from "react";
import { executeConditions } from "@turbo-agent/copilotkit-shared";

type InterruptProps = {
  event: any;
  result: any;
  render: (props: {
    event: any;
    result: any;
    resolve: (response: string) => void;
  }) => string;
  resolve: (response: string) => void;
};

const InterruptRenderer: React.FC<InterruptProps> = ({ event, result, render, resolve }) => {
  return render({ event, result, resolve });
};

export function useLangGraphInterruptRender(): string | null {
  const { langGraphInterruptAction, setLangGraphInterruptAction, agentSession } =
    useCopilotContext();

  const responseRef = React.useRef<string>();
  const resolveInterrupt = useCallback(
    (response: string) => {
      responseRef.current = response;
      // Use setTimeout to defer the state update to next tick
      setTimeout(() => {
        setLangGraphInterruptAction({ event: { response } });
      }, 0);
    },
    [setLangGraphInterruptAction],
  );

  if (
    !langGraphInterruptAction ||
    !langGraphInterruptAction.event ||
    !langGraphInterruptAction.render
  )
    return null;

  const { render, handler, event, enabled } = langGraphInterruptAction;

  const conditionsMet =
    !agentSession || !enabled
      ? true
      : enabled({ eventValue: event.value, agentMetadata: agentSession });
  if (!conditionsMet) {
    return null;
  }

  let result = null;
  if (handler) {
    result = handler({
      event,
      resolve: resolveInterrupt,
    });
  }

  // For Vue2, we return a string representation of the interrupt
  // The actual rendering should be handled by Vue2 components
  if (render) {
    return render({
      event,
      result,
      resolve: resolveInterrupt,
    });
  }
  
  return "Interrupt pending...";
}
