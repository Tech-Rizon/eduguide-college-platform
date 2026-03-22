import AsyncStorage from "@react-native-async-storage/async-storage";
import { differenceInDays, parseISO } from "date-fns";
import { create } from "zustand";
import type { Deadline } from "@types";
import { cancelDeadlineReminders, scheduleDeadlineReminders } from "@services/notifications";

const DEADLINES_KEY = "@eduguide/mobile/deadlines";

type DeadlineState = {
  deadlines: Deadline[];
  load: () => Promise<void>;
  add: (deadline: Deadline) => Promise<void>;
  remove: (deadlineId: string) => Promise<void>;
  getUpcoming: (days?: number) => Deadline[];
};

export const useDeadlineStore = create<DeadlineState>((set, get) => ({
  deadlines: [],

  load: async () => {
    const raw = await AsyncStorage.getItem(DEADLINES_KEY);
    if (!raw) return;
    set({ deadlines: JSON.parse(raw) as Deadline[] });
  },

  add: async (deadline) => {
    const deadlines = [...get().deadlines, deadline];
    set({ deadlines });
    await AsyncStorage.setItem(DEADLINES_KEY, JSON.stringify(deadlines));
    await scheduleDeadlineReminders(deadline).catch(() => undefined);
  },

  remove: async (deadlineId) => {
    const deadlines = get().deadlines.filter((deadline) => deadline.id !== deadlineId);
    set({ deadlines });
    await AsyncStorage.setItem(DEADLINES_KEY, JSON.stringify(deadlines));
    await cancelDeadlineReminders(deadlineId).catch(() => undefined);
  },

  getUpcoming: (days = 45) => {
    const now = new Date();
    return get()
      .deadlines.filter((deadline) => {
        const diff = differenceInDays(parseISO(deadline.date), now);
        return diff >= 0 && diff <= days;
      })
      .sort((left, right) => left.date.localeCompare(right.date));
  }
}));
