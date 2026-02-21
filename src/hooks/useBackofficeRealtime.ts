"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type UseBackofficeRealtimeOptions = {
  enabled: boolean;
  channelKey: string;
  onChange: () => void;
  tables?: string[];
};

export function useBackofficeRealtime({
  enabled,
  channelKey,
  onChange,
  tables = [
    "backoffice_tickets",
    "backoffice_ticket_messages",
    "backoffice_ticket_internal_notes",
    "backoffice_ticket_events",
  ],
}: UseBackofficeRealtimeOptions) {
  useEffect(() => {
    if (!enabled) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const triggerRefresh = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onChange();
      }, 250);
    };

    const channel = supabase.channel(`backoffice-${channelKey}-${crypto.randomUUID()}`);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        triggerRefresh
      );
    }

    channel.subscribe();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      supabase.removeChannel(channel);
    };
  }, [channelKey, enabled, onChange, tables]);
}
