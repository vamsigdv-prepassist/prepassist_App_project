import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Card,
  EmptyState,
  GradientButton,
  Pill,
  ScreenHeader,
} from "@/components/ui";
import { SUBJECT_PALETTE, useApp, type VaultDocument } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";

const SUBJECT_OPTIONS = [
  "Polity",
  "History",
  "Geography",
  "Economy",
  "Environment",
  "Science & Tech",
  "Ethics",
  "Other",
];

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isWeb = Platform.OS === "web";
  const { documents, addDocument, removeDocument } = useApp();

  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0]!);
  const [pages, setPages] = useState("");

  const handleAdd = () => {
    if (!title.trim()) {
      Alert.alert("Title required", "Please enter a document title.");
      return;
    }
    const pageCount = Number(pages) || Math.floor(Math.random() * 300) + 50;
    const colorIdx = Math.floor(Math.random() * SUBJECT_PALETTE.length);
    addDocument({
      title: title.trim(),
      subject,
      pages: pageCount,
      color: SUBJECT_PALETTE[colorIdx]!,
    });
    if (Platform.OS !== "web")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTitle("");
    setPages("");
    setSubject(SUBJECT_OPTIONS[0]!);
    setModalOpen(false);
  };

  const handleDelete = (doc: VaultDocument) => {
    Alert.alert(
      "Remove document?",
      `"${doc.title}" and its chat history will be permanently removed from your vault.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeDocument(doc.id),
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          paddingTop: insets.top + (isWeb ? 67 : 8),
        }}
      >
        <ScreenHeader
          title="Vault"
          subtitle="RAG-indexed documents you can speak to"
          right={
            <Pressable
              onPress={() => setModalOpen(true)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.headerBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Feather name="plus" size={20} color="#fff" />
            </Pressable>
          }
        />
      </View>

      <FlatList
        data={documents}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + (isWeb ? 110 : 100),
          gap: 10,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          documents.length > 0 ? (
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Pill
                label={`${documents.length} indexed`}
                icon="database"
                color={colors.primary}
                background={colors.primary + "12"}
              />
              <Pill
                label={`${documents.reduce((s, d) => s + d.pages, 0)} pages`}
                icon="layers"
                color={colors.accent}
                background={colors.accent + "12"}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: "center" }}>
            <EmptyState
              icon="archive"
              title="Your vault is empty"
              subtitle="Upload syllabus PDFs or notes to start chatting with your study material."
              cta="Add document"
              onCtaPress={() => setModalOpen(true)}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => handleDelete(item)}
            onPress={() => router.push(`/vault-chat/${item.id}` as never)}
            style={({ pressed }) => ({
              transform: pressed ? [{ scale: 0.99 }] : [],
            })}
          >
            <Card>
              <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                <View
                  style={[
                    styles.docIcon,
                    { backgroundColor: item.color + "18" },
                  ]}
                >
                  <Feather name="file-text" size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontFamily: "Inter_700Bold",
                      fontSize: 15,
                      letterSpacing: -0.2,
                    }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      marginTop: 4,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: item.color,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 12,
                      }}
                    >
                      {item.subject}
                    </Text>
                    <Text
                      style={{
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                        fontSize: 12,
                      }}
                    >
                      · {item.pages} pages
                    </Text>
                  </View>
                </View>
                <Feather
                  name="message-circle"
                  size={18}
                  color={colors.mutedForeground}
                />
              </View>
            </Card>
          </Pressable>
        )}
      />

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ marginBottom: 18 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontFamily: "Inter_800ExtraBold",
                  fontSize: 22,
                  letterSpacing: -0.5,
                }}
              >
                New document
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                We'll index it into your vector vault.
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              TITLE
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Indian Polity — Laxmikanth"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.foreground,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              SUBJECT
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
                marginBottom: 16,
              }}
            >
              {SUBJECT_OPTIONS.map((s) => {
                const active = subject === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setSubject(s)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: active
                        ? colors.primary
                        : colors.secondary,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? "#fff" : colors.secondaryForeground,
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 12,
                      }}
                    >
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              PAGES (OPTIONAL)
            </Text>
            <TextInput
              value={pages}
              onChangeText={setPages}
              placeholder="Auto"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.foreground,
                },
              ]}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setModalOpen(false)}
                style={{ flex: 1 }}
              />
              <View style={{ flex: 1 }}>
                <GradientButton
                  label="Index document"
                  icon="upload-cloud"
                  onPress={handleAdd}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,43,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    marginBottom: 16,
  },
});
