/**
 * <br/>
 * <img src="/images/CopilotPopup.gif" width="500" />
 *
 * A chatbot popup component for the CopilotKit framework. The component allows for a high degree
 * of customization through various props and custom CSS.
 *
 * See [CopilotSidebar](/reference/components/chat/CopilotSidebar) for a sidebar version of this component.
 *
 * ## Install Dependencies
 *
 * This component is part of the [@turbo-agent/copilotkit-react-ui](https://npmjs.com/package/@turbo-agent/copilotkit-react-ui) package.
 *
 * ```shell npm2yarn \"@turbo-agent/copilotkit-react-ui"\
 * npm install @turbo-agent/copilotkit-react-core @turbo-agent/copilotkit-react-ui
 * ```
 * ## Usage
 *
 * ```tsx
 * import { CopilotPopup } from "@turbo-agent/copilotkit-react-ui";
 * import "@turbo-agent/copilotkit-react-ui/styles.css";
 *
 * <CopilotPopup
 *   labels={{
 *     title: "Your Assistant",
 *     initial: "Hi! 👋 How can I assist you today?",
 *   }}
 * />
 * ```
 *
 * ### Look & Feel
 *
 * By default, CopilotKit components do not have any styles. You can import CopilotKit's stylesheet at the root of your project:
 * ```tsx title="YourRootComponent.tsx"
 * ...
 * import "@turbo-agent/copilotkit-react-ui/styles.css"; // [!code highlight]
 *
 * export function YourRootComponent() {
 *   return (
 *     <CopilotKit>
 *       ...
 *     </CopilotKit>
 *   );
 * }
 * ```
 * For more information about how to customize the styles, check out the [Customize Look & Feel](/guides/custom-look-and-feel/customize-built-in-ui-components) guide.
 */

import { CopilotModal, CopilotModalProps } from "./Modal";

export function CopilotPopup(props: CopilotModalProps) {
  props = {
    ...props,
    className: props.className ? props.className + " copilotKitPopup" : "copilotKitPopup",
  };
  return <CopilotModal {...props}>{props.children}</CopilotModal>;
}
