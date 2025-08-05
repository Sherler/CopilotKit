import { Parameter } from "@turbo-agent/copilotkit-shared";
import { Fragment, useCallback, useRef } from "react";
import { useCopilotContext } from "../context/copilot-context-vue2";
import { FrontendAction, ActionRenderProps } from "../types/frontend-action";
import { useCopilotAction } from "./use-copilot-action";


/**
 * Hook to create an authenticated action that requires user sign-in before execution.
 *
 * @remarks
 * This feature is only available when using CopilotKit's hosted cloud service.
 * To use this feature, sign up at https://cloud.copilotkit.ai to get your publicApiKey.
 *
 * @param action - The frontend action to be wrapped with authentication
 * @param dependencies - Optional array of dependencies that will trigger recreation of the action when changed
 */
export function useCopilotAuthenticatedAction_c<T extends Parameter[]>(
  action: FrontendAction<T>,
  dependencies?: any[],
): void {
  const { authConfig_c, authStates_c, setAuthStates_c } = useCopilotContext();
  const pendingActionRef = useRef<ActionRenderProps<Parameter[]> | null>(null);

  const executeAction = useCallback(
    (props: ActionRenderProps<Parameter[]>) => {
      if (typeof action.render === "function") {
        return action.render(props);
      }
      return action.render || "";
    },
    [action],
  );

  const wrappedRender = useCallback(
    (props: ActionRenderProps<Parameter[]>): string => {
      const isAuthenticated = Object.values(authStates_c || {}).some(
        (state) => state.status === "authenticated",
      );

      if (!isAuthenticated) {
        // Store action details for later execution
        pendingActionRef.current = props;

        // For Vue2, we return a string representation instead of React elements
        // The actual authentication UI should be handled by the Vue2 component
        return authConfig_c?.SignInComponent
          ? "Authentication required. Please sign in to continue."
          : "Authentication required.";
      }

      const result = executeAction(props);
      return typeof result === 'string' ? result : "";
    },
    [action, authStates_c, setAuthStates_c],
  );

  useCopilotAction(
    {
      ...action,
      render: wrappedRender,
    } as FrontendAction<T>,
    dependencies,
  );
}
