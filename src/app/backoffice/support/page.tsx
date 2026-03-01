"use client";

import { TicketQueueDashboard } from "@/components/backoffice/TicketQueueDashboard";

const SUPPORT_STATUSES = ["assigned", "in_progress", "waiting_on_student", "resolved", "closed"] as const;

export default function SupportDashboardPage() {
  return (
    <TicketQueueDashboard
      staffLevel="support"
      title="Support Dashboard"
      subtitle="Handle support and operations tickets assigned by auto-routing or managers."
      levelLabel="SUPPORT"
      availableStatuses={SUPPORT_STATUSES}
      emptyMessage="No support tickets are currently assigned to you."
    />
  );
}
