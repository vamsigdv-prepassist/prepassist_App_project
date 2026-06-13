import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";

type MessagePart = { text: string };
type ChatMessage = { role: "user" | "model"; parts: MessagePart[] };

const QUICK_PROMPTS = [
  "Analyze the Geography GS1 Syllabus",
  "Draft a 250-word answer structure for IR Mains",
  "Explain the Monetary Policy Committee",
];

export default function AIMentorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user) {
      setMessages([
        {
          role: "model",
          parts: [
            {
              text: "### Greetings, Aspirant.\nI am the PrepAssist Core Mentor. How can I assist you with your UPSC Strategy, Syllabus Analysis, or Conceptual doubt clearing today?",
            },
          ],
        },
      ]);
    }
  }, [user]);

  const submitPrompt = async (forcedPrompt?: string) => {
    const payloadText = forcedPrompt || input;
    if (!payloadText.trim() || isGenerating || !user) return;

    const newUserMsg: ChatMessage = { role: "user", parts: [{ text: payloadText }] };
    const currentHistory = [...messages, newUserMsg];

    setMessages(currentHistory);
    setInput("");
    setIsGenerating(true);
    
    // Scroll to bottom immediately on send
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const token = await user.getIdToken();
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const systemPrompt = `You are the PrepAssist AI Core, an elite, highly qualified Mentor for students preparing for the grueling Indian UPSC Civil Services Examination. 
      Your goal is to guide students precisely. Use structured formatting.
      - STRICTLY format your major headings using Markdown ### (Example: ### Geography Strategy)
      - Make sure to use **bold** text to emphasize crucial terms.
      - Use numbered lists or bullet points to make logic digestible.
      - Never hallucinate data. Be encouraging, highly professional, and strictly accurate.`;

      const mappedMessages = currentHistory
        .filter((m, i) => !(i === 0 && m.role === "model"))
        .map(msg => ({
          role: msg.role === "model" ? "assistant" : "user",
          content: msg.parts?.[0]?.text || ""
        }));

      mappedMessages.unshift({ role: "system", content: systemPrompt });

      const openRouterKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "";

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: mappedMessages,
          temperature: 0.7,
          max_tokens: 3000
        }),
      });

      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error(`Network Error: OpenRouter returned HTML. Status: ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to reach AI Core.");
      } else {
        const textOutput = data.choices?.[0]?.message?.content;
        if (!textOutput) throw new Error("AI Returned Null Output Mapping");
        
        setMessages([...currentHistory, { role: "model", parts: [{ text: textOutput }] }]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reach the AI Mentor.");
      setMessages(messages); // rollback
    } finally {
      setIsGenerating(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={s.headerTitleRow}>
          <View style={[s.iconBox, { backgroundColor: colors.primary }]}>
            <Feather name="cpu" size={20} color="#fff" />
          </View>
          <View>
            <Text style={[s.title, { color: colors.foreground }]}>AI Study Mentor</Text>
            <Text style={[s.sub, { color: colors.mutedForeground }]}>PrepAssist Core Matrix</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Chat Area */}
        <ScrollView
          ref={scrollViewRef}
          style={s.chatArea}
          contentContainerStyle={s.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            return (
              <View key={idx} style={[s.messageRow, isUser ? s.messageRowUser : s.messageRowModel]}>
                {!isUser && (
                  <View style={[s.avatar, { backgroundColor: colors.primary }]}>
                    <Feather name="cpu" size={14} color="#fff" />
                  </View>
                )}
                <View
                  style={[
                    s.bubble,
                    isUser
                      ? [s.bubbleUser, { backgroundColor: colors.foreground }]
                      : [s.bubbleModel, { backgroundColor: colors.card, borderColor: colors.border }],
                  ]}
                >
                  {isUser ? (
                    <Text style={[s.bubbleTextUser, { color: colors.background }]}>
                      {msg.parts[0].text}
                    </Text>
                  ) : (
                    <Markdown
                      style={{
                        body: { color: colors.foreground, fontSize: 15, lineHeight: 22 },
                        heading3: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 10, marginBottom: 5 },
                      }}
                    >
                      {msg.parts[0].text}
                    </Markdown>
                  )}
                </View>
                {isUser && (
                  <View style={[s.avatar, { backgroundColor: colors.foreground }]}>
                    <Feather name="user" size={14} color={colors.background} />
                  </View>
                )}
              </View>
            );
          })}

          {isGenerating && (
            <View style={[s.messageRow, s.messageRowModel]}>
              <View style={[s.avatar, { backgroundColor: colors.primary }]}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
              <View style={[s.bubble, s.bubbleModel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 12 }}>
                  SYNTHESIZING NEURAL OUTPUT...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[s.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {messages.length < 2 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickPrompts}>
              {QUICK_PROMPTS.map((p, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.quickBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
                  onPress={() => submitPrompt(p)}
                  disabled={isGenerating}
                >
                  <Text style={[s.quickBtnText, { color: colors.foreground }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={[s.inputRow, { backgroundColor: colors.muted }]}>
            <TextInput
              style={[s.input, { color: colors.foreground }]}
              placeholder="Formulate your query specifically..."
              placeholderTextColor={colors.mutedForeground}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                s.sendBtn,
                { backgroundColor: input.trim() ? colors.primary : colors.mutedForeground },
              ]}
              onPress={() => submitPrompt()}
              disabled={!input.trim() || isGenerating}
            >
              <Feather name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[s.creditText, { color: colors.mutedForeground }]}>
            Usage deducts exactly <Text style={{ color: "#F59E0B" }}>1 AI Credit</Text> globally.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontFamily: "Inter_800ExtraBold" },
  sub: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5, textTransform: "uppercase" },
  
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    gap: 16,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowModel: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "80%",
    padding: 14,
    borderRadius: 20,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleModel: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleTextUser: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    lineHeight: 22,
  },
  
  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
  },
  quickPrompts: {
    flexDirection: "row",
    marginBottom: 12,
  },
  quickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  quickBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 50,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginBottom: 2,
  },
  creditText: {
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
});
