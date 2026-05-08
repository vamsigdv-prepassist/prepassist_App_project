import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Pill } from "@/components/ui";
import { useApp } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { bm25Retrieve, ragAnswerStream } from "@/lib/ai";

const SUGGESTIONS = [
  "Summarise this in 5 points",
  "Likely Mains question from here",
  "Compare with previous year syllabus",
  "Generate 3 prelims MCQs",
];

export default function VaultChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { documents, chats, addChatMessage, updateChatMessage } = useApp();
  const doc = useMemo(
    () => documents.find((d) => d.id === id),
    [documents, id],
  );
  const messages = useMemo(() => (id ? chats[id] ?? [] : []), [chats, id]);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length, thinking]);

  const send = async (textArg?: string) => {
    const text = (textArg ?? input).trim();
    if (!text || !doc || thinking) return;
    addChatMessage({ documentId: doc.id, role: "user", text });
    setInput("");
    if (Platform.OS !== "web")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThinking(true);
    const history = (messages ?? []).slice(-8).map((m) => ({
      role: m.role,
      content: m.text,
    }));
    const placeholder = addChatMessage({
      documentId: doc.id,
      role: "assistant",
      text: "",
    });
    try {
      let retrievedChunks: string[] | undefined;
      if (doc.chunks && doc.chunks.length > 0) {
        retrievedChunks = bm25Retrieve(doc.chunks, text, 5);
      }
      await ragAnswerStream(
        {
          question: text,
          documentTitle: doc.title,
          documentNotes: `Subject: ${doc.subject}. Pages: ${doc.pages}.`,
          retrievedChunks,
          history,
        },
        (_delta, full) => {
          updateChatMessage(doc.id, placeholder.id, { text: full });
        },
      );
    } catch (e) {
      updateChatMessage(doc.id, placeholder.id, {
        text: "Sorry — I couldn't reach the AI service. Please check your connection and try again.",
      });
    } finally {
      setThinking(false);
    }
  };

  if (!doc) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.mutedForeground }}>Document not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.docHeader,
          { borderBottomColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.docIcon,
            { backgroundColor: doc.color + "18" },
          ]}
        >
          <Feather name="file-text" size={20} color={doc.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.foreground,
              fontFamily: "Inter_700Bold",
              fontSize: 15,
              letterSpacing: -0.2,
            }}
            numberOfLines={1}
          >
            {doc.title}
          </Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
            <Pill
              label={doc.subject}
              color={doc.color}
              background={doc.color + "12"}
            />
            <Pill label={`${doc.pages} pp`} icon="layers" />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 12,
            gap: 12,
          }}
          ListEmptyComponent={
            <View style={{ paddingVertical: 32 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  backgroundColor: colors.secondary,
                  alignItems: "center",
                  justifyContent: "center",
                  alignSelf: "center",
                  marginBottom: 14,
                }}
              >
                <Feather name="message-square" size={22} color={colors.primary} />
              </View>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 16,
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                Speak to this document
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  textAlign: "center",
                  lineHeight: 19,
                  paddingHorizontal: 20,
                }}
              >
                Ask anything from "{doc.title}". The AI retrieves the relevant
                passages and answers contextually.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === "user"
                  ? {
                      backgroundColor: colors.primary,
                      alignSelf: "flex-end",
                      borderBottomRightRadius: 6,
                    }
                  : {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderWidth: 1,
                      alignSelf: "flex-start",
                      borderBottomLeftRadius: 6,
                    },
              ]}
            >
              <Text
                style={{
                  color:
                    item.role === "user" ? "#fff" : colors.foreground,
                  fontFamily: "Inter_500Medium",
                  fontSize: 14.5,
                  lineHeight: 21,
                }}
              >
                {item.text}
              </Text>
            </View>
          )}
          ListFooterComponent={
            thinking ? (
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                    alignSelf: "flex-start",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  },
                ]}
              >
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={{
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                  }}
                >
                  Searching the vault…
                </Text>
              </View>
            ) : null
          }
        />

        {messages.length === 0 && !thinking && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 8,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => send(s)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    color: colors.foreground,
                    fontFamily: "Inter_500Medium",
                    fontSize: 12,
                  }}
                >
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}
        >
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={`Ask "${doc.title}" anything…`}
              placeholderTextColor={colors.mutedForeground}
              style={{
                flex: 1,
                color: colors.foreground,
                fontFamily: "Inter_500Medium",
                fontSize: 15,
                paddingHorizontal: 16,
                paddingVertical: 12,
                maxHeight: 120,
              }}
              multiline
              onSubmitEditing={() => send()}
            />
            <Pressable
              onPress={() => send()}
              disabled={!input.trim() || thinking}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor:
                    !input.trim() || thinking
                      ? colors.muted
                      : colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather
                name="arrow-up"
                size={18}
                color={
                  !input.trim() || thinking
                    ? colors.mutedForeground
                    : "#fff"
                }
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  docHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    maxWidth: "85%",
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    borderRadius: 26,
    borderWidth: 1,
    paddingRight: 6,
    paddingVertical: 4,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
