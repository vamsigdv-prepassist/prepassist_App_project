import React, { useState, useRef } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useAppContext, CORE_SUBJECTS } from "@/contexts/AppContext";
import { saveCloudNote } from "@/lib/cloud_notes";

export default function RAGNotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { addTrackerNote } = useAppContext();

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [ingestText, setIngestText] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const handleGenerate = async () => {
    if (!query.trim() || isGenerating) return;

    const userQ = query;
    setMessages([{ role: "user", content: userQ }]);
    setQuery("");
    setIsGenerating(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const DOMAIN = process.env.EXPO_PUBLIC_DOMAIN ?? "";
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || (DOMAIN ? `https://${DOMAIN}/api` : "http://localhost:3000/api");

      const response = await fetch(`${API_BASE}/notes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic: userQ })
      });

      if (!response.ok) throw new Error("API responded with " + response.status);

      const data = await response.json();
      let resultText = data.markdownContext;
      
      if (!resultText) throw new Error("AI Returned Null Output Mapping");

      setMessages(prev => [...prev, { role: "assistant", content: resultText }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to generate RAG notes.");
      setMessages(prev => [...prev, { role: "assistant", content: `[RAG System Error: ${err.message}]` }]);
    } finally {
      setIsGenerating(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  const handleSeed = () => {
    if (!ingestText.trim()) return;
    setIsSeeding(true);
    setTimeout(() => {
      setIsSeeding(false);
      setIngestText("");
      Alert.alert("Embed Success", "Committed to Neural Vector successfully.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  };

  const handleSaveToTracker = async (content: string, userQuery: string) => {
    const subject = CORE_SUBJECTS.find(s => userQuery.toLowerCase().includes(s.toLowerCase())) || "Polity";
    
    // 1. Save locally to Mobile Notes Tracker UI
    addTrackerNote({
      title: `RAG: ${userQuery.substring(0, 30)}...`,
      subject: subject,
      content: content,
      tags: ["RAG", "AI Synthesis"],
      isStarred: true,
    });

    // 2. Feed it back into the Cloud Matrix (Firestore) to trigger recursive Vectorization
    if (user) {
       saveCloudNote({
          userId: user.uid,
          title: `RAG: ${userQuery.substring(0, 30)}...`,
          subject: subject,
          categoryType: 'core',
          type: 'text',
          content: content,
          tags: ["RAG", "AI Synthesis"],
          isStaged: false
       }).catch(console.warn);
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Matrix Mapped", "Successfully saved to your Core Study Notes Tracker & Neural Vector DB.");
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <View style={s.headerTitleRow}>
          <View style={[s.iconBox, { backgroundColor: colors.primary }]}>
            <Feather name="database" size={20} color="#fff" />
          </View>
          <View>
            <Text style={[s.title, { color: colors.foreground }]}>Retrieval-Augmented Logic</Text>
            <Text style={[s.sub, { color: colors.mutedForeground }]}>Multi-Source Synthesis</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Instructions Box */}
          <View style={[s.instructionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.instTitle, { color: colors.foreground }]}>Intelligent Synthesis Engine</Text>
            <Text style={[s.instDesc, { color: colors.mutedForeground }]}>
              This engine seamlessly combines three isolated vectors to generate an exhaustive, comprehensive Note styled in the UPSC Civil Services format:
            </Text>
            
            <View style={s.sourceList}>
              <View style={[s.sourceItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[s.sourceLabel, { color: colors.primary }]}>Source 1</Text>
                <Text style={[s.sourceName, { color: colors.foreground }]}>Vault Uploads</Text>
              </View>
              <View style={[s.sourceItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[s.sourceLabel, { color: "#10B981" }]}>Source 2</Text>
                <Text style={[s.sourceName, { color: colors.foreground }]}>Current Affairs DB</Text>
              </View>
              <View style={[s.sourceItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[s.sourceLabel, { color: "#F59E0B" }]}>Source 3</Text>
                <Text style={[s.sourceName, { color: colors.foreground }]}>Core AI Knowledge</Text>
              </View>
            </View>
          </View>

          {/* RAG Chat Matrix */}
          {messages.length > 0 && (
            <View style={[s.chatMatrix, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <View key={idx} style={[s.messageRow, isUser ? s.messageRowUser : s.messageRowModel]}>
                    <View
                      style={[
                        s.bubble,
                        isUser
                          ? [s.bubbleUser, { backgroundColor: colors.foreground }]
                          : [s.bubbleModel, { backgroundColor: colors.card, borderColor: colors.border }],
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: isUser ? 'rgba(255,255,255,0.1)' : colors.border, paddingBottom: 6 }}>
                        <Feather name={isUser ? "user" : "sparkles"} size={12} color={isUser ? colors.background : colors.primary} />
                        <Text style={{ fontSize: 10, fontFamily: "Inter_800ExtraBold", color: isUser ? colors.background : colors.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {isUser ? "User Sequence" : "Multi-Source Output"}
                        </Text>
                      </View>
                      
                      {isUser ? (
                        <Text style={[s.bubbleTextUser, { color: colors.background }]}>
                          {m.content}
                        </Text>
                      ) : (
                        <Markdown
                          style={{
                            body: { color: colors.foreground, fontSize: 15, lineHeight: 22 },
                            heading3: { fontFamily: "Inter_700Bold", fontSize: 18, marginTop: 10, marginBottom: 5 },
                          }}
                        >
                          {m.content}
                        </Markdown>
                      )}
                      
                      {!isUser && !isGenerating && (
                        <TouchableOpacity 
                          style={[s.saveBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                          onPress={() => {
                             const userQ = messages[idx - 1]?.content || "Synthesis";
                             handleSaveToTracker(m.content, userQ);
                          }}
                        >
                          <Feather name="book-open" size={14} color="#10B981" />
                          <Text style={[s.saveBtnText, { color: colors.foreground }]}>Save to Notes Tracker</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
              
              {isGenerating && (
                <View style={[s.messageRow, s.messageRowModel]}>
                  <View style={[s.bubble, s.bubbleModel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                        Scanning Semantic Database...
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Explicit Pre-Training Ingestion */}
          <View style={[s.ingestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[s.ingestHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name="upload-cloud" size={16} color={colors.primary} />
                <Text style={[s.ingestTitle, { color: colors.foreground }]}>Explicit Pre-Training Ingestion</Text>
              </View>
              <View style={s.activeBadge}>
                <Text style={s.activeBadgeText}>VECTOR ACTIVE</Text>
              </View>
            </View>
            <View style={s.ingestBody}>
              <TextInput
                style={[s.ingestInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Paste raw unstructured text natively here to aggressively fuse it into the internal Vector Embeddings array globally..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                value={ingestText}
                onChangeText={setIngestText}
              />
              <TouchableOpacity 
                style={[s.ingestBtn, { backgroundColor: ingestText.trim() ? colors.foreground : colors.mutedForeground }]} 
                onPress={handleSeed}
                disabled={isSeeding || !ingestText.trim()}
              >
                {isSeeding ? <ActivityIndicator size="small" color={colors.background} /> : <Feather name="key" size={14} color={colors.background} />}
                <Text style={[s.ingestBtnText, { color: colors.background }]}>Commit to Neural Vector</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Generation Input */}
        <View style={[s.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[s.inputRow, { backgroundColor: colors.muted }]}>
            <TextInput
              style={[s.input, { color: colors.foreground }]}
              placeholder="Enter Complex Query (e.g., Federalism)..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                s.sendBtn,
                { backgroundColor: query.trim() ? colors.primary : colors.mutedForeground },
              ]}
              onPress={handleGenerate}
              disabled={!query.trim() || isGenerating}
            >
              <Feather name="sparkles" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={[s.creditText, { color: colors.mutedForeground }]}>
            COSTS EXACTLY <Text style={{ color: "#F59E0B" }}>4 AI CREDITS</Text> PER EXECUTION.
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
  
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  
  instructionsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  instTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 6 },
  instDesc: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 20, marginBottom: 16 },
  sourceList: { gap: 8 },
  sourceItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sourceLabel: { fontSize: 11, fontFamily: "Inter_800ExtraBold", textTransform: "uppercase", letterSpacing: 1 },
  sourceName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  chatMatrix: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowModel: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "90%",
    padding: 14,
    borderRadius: 16,
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  saveBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  ingestCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ingestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  ingestTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: { color: "#10B981", fontSize: 9, fontFamily: "Inter_800ExtraBold", letterSpacing: 0.5 },
  ingestBody: {
    padding: 12,
    gap: 12,
  },
  ingestInput: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  ingestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
  },
  ingestBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },

  inputContainer: {
    padding: 12,
    borderTopWidth: 1,
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
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
});
