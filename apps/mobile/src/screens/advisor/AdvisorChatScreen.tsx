import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { CollegeCard } from "@components/CollegeCard";
import { ScreenShell } from "@components/ScreenShell";
import { SectionCard } from "@components/SectionCard";
import type { CollegeSummary } from "@types";
import { useChatStore } from "@store/useChatStore";
import { useCollegeStore } from "@store/useCollegeStore";
import { useProfileStore } from "@store/useProfileStore";
import { colors, commonStyles, fontSize, radius, spacing } from "@theme";

export default function AdvisorChatScreen() {
  const navigation = useNavigation<any>();
  const profile = useProfileStore((state) => state.profile);
  const messages = useChatStore((state) => state.messages);
  const isSending = useChatStore((state) => state.isSending);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const setSelectedCollege = useCollegeStore((state) => state.setSelectedCollege);

  const [input, setInput] = useState("");
  const [recommendedColleges, setRecommendedColleges] = useState<CollegeSummary[]>([]);

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  async function handleSend(contentOverride?: string) {
    const content = (contentOverride ?? input).trim();
    if (!content || isSending) return;
    setInput("");
    const response = await sendMessage(content, profile);
    if (response?.recommendedColleges?.length) {
      setRecommendedColleges(response.recommendedColleges);
    }
  }

  return (
    <ScreenShell style={styles.flex}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>AI advisor</Text>
            <Text style={styles.subtitle}>
              Ask for a shortlist, cost reality check, scholarship ideas, or your next action.
            </Text>
          </View>

          <SectionCard title="Conversation">
            <View style={styles.messageList}>
              {messages.map((message) => {
                const assistant = message.role === "assistant";
                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      assistant ? styles.assistantBubble : styles.userBubble
                    ]}
                  >
                    <Text style={[styles.messageRole, assistant ? styles.assistantRole : styles.userRole]}>
                      {assistant ? "Advisor" : "You"}
                    </Text>
                    <Text style={styles.messageText}>
                      {message.content || (message.isStreaming ? "..." : "")}
                    </Text>
                  </View>
                );
              })}
            </View>
          </SectionCard>

          {lastAssistantMessage?.suggestions?.length ? (
            <SectionCard title="Quick prompts">
              <View style={styles.promptGrid}>
                {lastAssistantMessage.suggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.promptChip}
                    activeOpacity={0.9}
                    onPress={() => void handleSend(suggestion)}
                  >
                    <Text style={styles.promptChipText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </SectionCard>
          ) : null}

          {recommendedColleges.length ? (
            <SectionCard title="Suggested schools" subtitle="Returned from the advisor response.">
              <View style={styles.recommendationList}>
                {recommendedColleges.map((college) => (
                  <CollegeCard
                    key={college.id}
                    college={college}
                    onPress={() => {
                      setSelectedCollege(college);
                      navigation.navigate("CollegesTab", {
                        screen: "CollegeDetail",
                        params: { collegeId: college.id, college }
                      });
                    }}
                  />
                ))}
              </View>
            </SectionCard>
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about colleges, scholarships, or deadlines"
            placeholderTextColor={colors.textTertiary}
            multiline
            style={styles.input}
          />
          <TouchableOpacity
            style={styles.sendButton}
            activeOpacity={0.9}
            onPress={() => void handleSend()}
          >
            <Ionicons name="arrow-up" size={18} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg
  },
  header: {
    gap: spacing.sm
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize["2xl"],
    fontWeight: "700"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 22
  },
  messageList: {
    gap: spacing.md
  },
  messageBubble: {
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.xs
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  userBubble: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.borderLight
  },
  messageRole: {
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  assistantRole: {
    color: colors.sky
  },
  userRole: {
    color: colors.accent
  },
  messageText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    lineHeight: 22
  },
  promptGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  promptChip: {
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm
  },
  promptChipText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: "500"
  },
  recommendationList: {
    gap: spacing.md
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg
  },
  input: {
    ...commonStyles.input,
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    textAlignVertical: "top"
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  }
});
