import { create } from "zustand";
import type { AdvisorResponse, ChatMessage, StudentProfile } from "@types";
import { createId } from "@utils/ids";
import { streamAdvisorResponse } from "@services/aiAdvisor";

type ChatState = {
  messages: ChatMessage[];
  isSending: boolean;
  sendMessage: (content: string, profile: StudentProfile | null) => Promise<AdvisorResponse | null>;
  reset: () => void;
};

const welcomeMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "I can help you narrow your college list, think through cost, and decide what to do next. Tell me what you want to study, where you want to stay, or what is stressing you out.",
  timestamp: new Date().toISOString(),
  suggestions: ["Find colleges for me", "Help with scholarships", "Compare my options"]
};

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [welcomeMessage],
  isSending: false,

  sendMessage: async (content, profile) => {
    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content,
      timestamp: new Date().toISOString()
    };
    const streamingMessageId = createId("assistant");
    const assistantPlaceholder: ChatMessage = {
      id: streamingMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
      isStreaming: true
    };

    set((state) => ({
      messages: [...state.messages, userMessage, assistantPlaceholder],
      isSending: true
    }));

    try {
      const response = await streamAdvisorResponse(
        [...get().messages.filter((message) => !message.isStreaming), userMessage],
        profile,
        (chunk) => {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === streamingMessageId
                ? { ...message, content: `${message.content}${chunk}` }
                : message
            )
          }));
        }
      );

      set((state) => ({
        isSending: false,
        messages: state.messages.map((message) =>
          message.id === streamingMessageId
            ? {
                ...message,
                content: response.text,
                suggestions: response.suggestions,
                isStreaming: false
              }
            : message
        )
      }));

      return response;
    } catch {
      set((state) => ({
        isSending: false,
        messages: state.messages.map((message) =>
          message.id === streamingMessageId
            ? {
                ...message,
                content: "I ran into a problem reaching the advisor service. Try again in a moment.",
                isStreaming: false
              }
            : message
        )
      }));
      return null;
    }
  },

  reset: () => set({ messages: [welcomeMessage], isSending: false })
}));
