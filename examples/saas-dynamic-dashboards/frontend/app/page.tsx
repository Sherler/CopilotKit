import { DashboardShell } from "@/components/dashboard-shell"
import { DeveloperDashboard } from "@/components/developer-dashboard"
import { CopilotKit } from "@think-copilotkit/react-core"

export default function Home() {
  return (
    <DashboardShell>
      <DeveloperDashboard />
    </DashboardShell>
  )
}
