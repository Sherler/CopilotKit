/**
 * <br/>
 * <img src="/images/CopilotSidebar.gif" width="500" />
 *
 * A chatbot sidebar component for the CopilotKit framework. Highly customizable through various props and custom CSS.
 *
 * See [CopilotPopup](/reference/components/chat/CopilotPopup) for a popup version of this component.
 *
 * ## Install Dependencies
 *
 * This component is part of the [@think-copilotkit/react-ui](https://npmjs.com/package/@think-copilotkit/react-ui) package.
 *
 * ```shell npm2yarn \"@think-copilotkit/react-ui"\
 * npm install @think-copilotkit/react-core @think-copilotkit/react-ui
 * ```
 *
 * ## Usage
 *
 * ```tsx
 * import { CopilotSidebar } from "@think-copilotkit/react-ui";
 * import "@think-copilotkit/react-ui/styles.css";
 *
 * <CopilotSidebar
 *   labels={{
 *     title: "Your Assistant",
 *     initial: "Hi! 👋 How can I assist you today?",
 *   }}
 * >
 *   <YourApp/>
 * </CopilotSidebar>
 * ```
 *
 * ### Look & Feel
 *
 * By default, CopilotKit components do not have any styles. You can import CopilotKit's stylesheet at the root of your project:
 * ```tsx title="YourRootComponent.tsx"
 * ...
 * import "@think-copilotkit/react-ui/styles.css"; // [!code highlight]
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
import React, { useState } from "react";
import { CopilotModal, CopilotModalProps } from "./Modal";

export function CopilotSidebar(props: CopilotModalProps) {
  props = {
    ...props,
    className: props.className ? props.className + " copilotKitSidebar" : "copilotKitSidebar",
  };
  const [expandedClassName, setExpandedClassName] = useState(
    props.defaultOpen ? "sidebarExpanded" : "",
  );

  const onSetOpen = (open: boolean) => {
    props.onSetOpen?.(open);
    setExpandedClassName(open ? "sidebarExpanded" : "");
  };

  return (
    <div className={`copilotKitSidebarContentWrapper ${expandedClassName}`}>
      <CopilotModal {...props} {...{ onSetOpen }}>
        {props.children}
      </CopilotModal>
    </div>
  );
}
