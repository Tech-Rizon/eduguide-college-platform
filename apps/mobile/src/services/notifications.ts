import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { format } from "date-fns";
import { Platform } from "react-native";
import type { Deadline } from "@types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true
  })
});

export async function setupNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("deadlines", {
      name: "Deadlines",
      importance: Notifications.AndroidImportance.HIGH
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId
  }).catch(() => null);

  return token?.data ?? null;
}

export async function scheduleDeadlineReminders(deadline: Deadline) {
  for (const daysBefore of deadline.notifyDaysBefore) {
    const target = new Date(deadline.date);
    target.setDate(target.getDate() - daysBefore);
    if (target <= new Date()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title:
          daysBefore === 1
            ? `${deadline.collegeName} deadline tomorrow`
            : `${deadline.collegeName} deadline in ${daysBefore} days`,
        body: `${deadline.type} deadline on ${format(new Date(deadline.date), "MMM d, yyyy")}`,
        data: { deadlineId: deadline.id, collegeId: deadline.collegeId }
      },
      trigger: {
        date: target
      } as Notifications.DateTriggerInput
    });
  }
}

export async function cancelDeadlineReminders(deadlineId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.deadlineId === deadlineId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}
