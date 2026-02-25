"use client";

import { TicketQueueDashboard } from "@/components/backoffice/TicketQueueDashboard";

const TUTOR_STATUSES = ["assigned", "in_progress", "waiting_on_student", "resolved"] as const;

export default function TutorDashboardPage() {
  return (
    <TicketQueueDashboard
      staffLevel="tutor"
      title="Tutor Dashboard"
      subtitle="Work assigned tutoring tickets and keep status synchronized with student workflows."
      levelLabel="TUTOR"
      availableStatuses={TUTOR_STATUSES}
      emptyMessage="No tutoring tickets are currently assigned to you."
    />
  );
}
