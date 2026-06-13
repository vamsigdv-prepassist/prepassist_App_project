import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import Markdown from "react-native-markdown-display";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { auth } from "@/lib/firebase";
import { analyzeDocumentNatively } from "@/lib/xray";

export default function XRayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const CORE_SUBJECTS = ["Polity", "History", "Economy", "Geography", "Environment", "Science"];
  const [subject, setSubject] = useState(CORE_SUBJECTS[0]);

  async function handlePickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.fileName || "scan.jpg",
          type: "image/jpeg",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert("Error", "Could not pick image.");
    }
  }

  async function handlePickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/pdf",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert("Error", "Could not pick document.");
    }
  }

  async function triggerAnalysis() {
    if (!selectedFile) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsUploading(true);

      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You must be logged in to use the X-Ray Reader.");
        setIsUploading(false);
        return;
      }

      // Native analysis! No more localhost backend required.
      const data = await analyzeDocumentNatively(
        selectedFile.uri, 
        selectedFile.type, 
        subject,
        user.uid
      );

      setParsedData(data);
      setModalVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (err: any) {
      Alert.alert("Analysis Failed", err.message || "Could not reach the X-Ray Analysis Engine.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Header */}
        <View style={s.header}>
          <View style={[s.iconBox, { backgroundColor: colors.primary }]}>
            <Feather name="aperture" size={24} color="#fff" />
          </View>
          <View>
            <View style={s.badgeWrap}>
              <Text style={s.badgeText}>SMART SCANNER TOOL</Text>
            </View>
            <Text style={[s.title, { color: colors.foreground }]}>X-Ray Matrix</Text>
            <Text style={[s.sub, { color: colors.mutedForeground }]}>
              Upload a snapshot of any textbook page to receive an instant mentorship analysis.
            </Text>
          </View>
        </View>

        {/* Subject Selector */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 14, color: colors.foreground, marginBottom: 10 }}>Select Agent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {CORE_SUBJECTS.map(subj => {
              const isSelected = subject === subj;
              return (
                <TouchableOpacity
                  key={subj}
                  style={[
                    s.subjectChip,
                    { 
                      backgroundColor: isSelected ? colors.primary : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => setSubject(subj)}
                >
                  <Text style={[s.subjectChipText, { color: isSelected ? "#fff" : colors.mutedForeground }]}>{subj}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Upload Card */}
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.cardIconWrap}>
            <Feather name="upload-cloud" size={32} color={colors.primary} />
          </View>
          <Text style={[s.cardTitle, { color: colors.foreground }]}>Deploy Source Material</Text>
          <Text style={[s.cardSub, { color: colors.mutedForeground }]}>
            Accepts PDF references or Camera Snippets
          </Text>

          <View style={s.btnRow}>
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary }]} onPress={handlePickImage}>
              <Feather name="image" size={16} color="#fff" />
              <Text style={s.actionBtnText}>Pick Image</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]} onPress={handlePickDocument}>
              <Feather name="file-text" size={16} color={colors.foreground} />
              <Text style={[s.actionBtnText, { color: colors.foreground }]}>Pick PDF</Text>
            </TouchableOpacity>
          </View>

          {selectedFile && (
            <View style={[s.previewBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Feather name="check-circle" size={20} color="#10B981" />
              <Text style={[s.fileName, { color: colors.foreground }]} numberOfLines={1}>
                {selectedFile.name}
              </Text>
            </View>
          )}

          {selectedFile && (
            <TouchableOpacity
              style={[s.analyzeBtn, { backgroundColor: colors.primary }]}
              onPress={triggerAnalysis}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="cpu" size={18} color="#fff" />
              )}
              <Text style={s.analyzeBtnText}>
                {isUploading ? "Constructing Matrix..." : "Execute Analysis"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <LinearGradient
          colors={["#312E81", "#1E1B4B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.infoCard}
        >
          <View style={s.infoRow}>
            <Feather name="info" size={18} color="#A5B4FC" />
            <Text style={s.infoTitle}>How to Use</Text>
          </View>
          <Text style={s.infoDesc}>
            Take a clear photo of your NCERT or UPSC textbook. Our semantic engine will read the text, find context in current affairs, and generate actionable prelims questions!
          </Text>
        </LinearGradient>
      </ScrollView>

      {/* Result Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[s.modalRoot, { backgroundColor: colors.background }]} edges={["top"]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>Matrix Analysis</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={s.closeBtn}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView style={s.modalScroll} contentContainerStyle={s.modalContent}>
            {parsedData && (
              <Markdown style={{ body: { color: colors.foreground, fontSize: 16, lineHeight: 24 } }}>
                {parsedData.content || parsedData.analysis || 
                  [
                    parsedData.deep_dive && `## 🔍 Deep Dive\n${parsedData.deep_dive}`,
                    parsedData.current_affairs && `## 📰 Current Affairs\n${parsedData.current_affairs}`,
                    parsedData.prelims_practice && `## 📝 Prelims Practice\n${parsedData.prelims_practice}`,
                    parsedData.history && `## ⏳ Historical Context\n${parsedData.history}`,
                    parsedData.references && `## 📚 References\n${parsedData.references}`
                  ].filter(Boolean).join('\n\n---\n\n') || "No analysis content found."}
              </Markdown>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, gap: 24, paddingBottom: 40 },
  header: { flexDirection: "row", gap: 16, alignItems: "center" },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  badgeWrap: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_800ExtraBold", color: "#4338CA", letterSpacing: 0.5 },
  title: { fontSize: 26, fontFamily: "Inter_800ExtraBold", letterSpacing: -0.5 },
  sub: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 4, maxWidth: "90%", lineHeight: 20 },

  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
  },
  cardIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  cardSub: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", marginBottom: 24 },
  btnRow: { flexDirection: "row", gap: 12, width: "100%" },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: 12,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
  },
  fileName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 22,
  },
  subjectChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  subjectChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  analyzeBtn: {
    width: "100%",
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  analyzeBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },

  infoCard: {
    borderRadius: 20,
    padding: 20,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  infoTitle: { color: "#A5B4FC", fontSize: 13, fontFamily: "Inter_800ExtraBold", textTransform: "uppercase", tracking: 1 },
  infoDesc: { color: "#E0E7FF", fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },

  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  closeBtn: { padding: 4 },
  modalScroll: { flex: 1 },
  modalContent: { padding: 20, paddingBottom: 60 },
});
