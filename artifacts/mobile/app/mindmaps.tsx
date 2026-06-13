import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { useApp, MindmapNode, UserMindmap } from "@/contexts/AppContext";
import { useColors } from "@/hooks/useColors";
import { Card, Button, Pill, GradientButton, SectionHeader } from "@/components/ui";
import { Stack } from "expo-router";

const MapNodeVisualizer = ({ node, level = 0, colors }: { node: MindmapNode, level?: number, colors: any }) => {
  const [isOpen, setIsOpen] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  const getStyleForLevel = (lvl: number) => {
    if (lvl === 0) return s.nodeLevel0;
    if (lvl === 1) return s.nodeLevel1;
    if (lvl === 2) return s.nodeLevel2;
    return s.nodeLevel3;
  };

  const getTextStyleForLevel = (lvl: number) => {
    if (lvl === 0) return s.nodeText0;
    if (lvl === 1) return s.nodeText1;
    if (lvl === 2) return s.nodeText2;
    return s.nodeText3;
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 8 }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          if (hasChildren) {
            if (Platform.OS !== "web") Haptics.selectionAsync();
            setIsOpen(!isOpen);
          }
        }}
        style={[getStyleForLevel(level), { borderColor: level > 0 ? colors.border : undefined }]}
      >
        <Text style={[getTextStyleForLevel(level), { color: level === 0 ? "#fff" : colors.foreground }]}>
          {node.title}
        </Text>
        {hasChildren && (
          <View style={[s.badge, { borderColor: isOpen ? colors.accent : colors.border, backgroundColor: colors.background }]}>
            <Text style={[s.badgeText, { color: isOpen ? colors.accent : colors.mutedForeground }]}>
              {node.children!.length}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {hasChildren && isOpen && (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={[s.hLine, { backgroundColor: colors.border }]} />
          <View style={[s.vLineContainer, { borderColor: colors.border }]}>
            {node.children!.map((child, idx) => (
              <View key={idx} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[s.childHLine, { backgroundColor: colors.border }]} />
                <MapNodeVisualizer node={child} level={level + 1} colors={colors} />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

export default function MindmapsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { mindmaps, addMindmap, removeMindmap } = useApp();

  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeMap, setActiveMap] = useState<MindmapNode | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>("");

  const horizontalRef = React.useRef<ScrollView>(null);
  const verticalRef = React.useRef<ScrollView>(null);
  const screenWidth = Dimensions.get("window").width;

  React.useEffect(() => {
    if (activeMap) {
      setTimeout(() => {
        horizontalRef.current?.scrollTo({ x: 0, animated: false });
        verticalRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
    }
  }, [activeMap]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    
    // Simulate generation (Fallback logic if endpoint isn't wired perfectly in React Native yet)
    setTimeout(() => {
      const generatedMap: MindmapNode = {
        title: topic.trim(),
        children: [
          {
            title: "Historical Context",
            children: [{ title: "Pre-independence era" }, { title: "Post-independence reforms" }]
          },
          {
            title: "Core Principles",
            children: [{ title: "Constitutional backing" }, { title: "Key doctrines" }]
          },
          {
            title: "Modern Implications",
            children: [{ title: "Supreme Court judgments" }, { title: "Current affairs relevance" }]
          }
        ]
      };
      
      addMindmap(topic.trim(), generatedMap);
      setActiveMap(generatedMap);
      setActiveTopic(topic.trim());
      setTopic("");
      setIsGenerating(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2000);
  };

  const loadFromHistory = (historicalMap: UserMindmap) => {
    setActiveMap(historicalMap.mapData);
    setActiveTopic(historicalMap.topic);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        
        <View style={s.header}>
          <Pill label="Cognitive Topography" icon="share-2" color={colors.accent} background={colors.accent + "1A"} />
          <Text style={[s.title, { color: colors.foreground }]}>
            AI Mindmap <Text style={{ color: colors.accent }}>Engine.</Text>
          </Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Instantly construct deeply nested structural visualization trees breaking down massive concepts.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <View style={[s.inputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[s.input, { color: colors.foreground }]}
              placeholder="Enter Topic (e.g., Inflation Impacts)"
              placeholderTextColor={colors.mutedForeground}
              value={topic}
              onChangeText={setTopic}
              onSubmitEditing={handleGenerate}
            />
            <TouchableOpacity 
              style={[s.genBtn, { backgroundColor: isGenerating || !topic.trim() ? colors.muted : colors.accent }]}
              onPress={handleGenerate}
              disabled={isGenerating || !topic.trim()}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="zap" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* History */}
        <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
          <SectionHeader title="Cached Mindmaps" subtitle="Previously generated structural arrays" />
          
          {mindmaps.length === 0 ? (
            <View style={[s.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="share-2" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No historical Mindmaps structurally committed.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {mindmaps.map(m => (
                <TouchableOpacity key={m.id} onPress={() => loadFromHistory(m)} activeOpacity={0.8}>
                  <Card>
                    <View style={s.historyRow}>
                      <View style={[s.historyIcon, { backgroundColor: colors.accent + "15" }]}>
                        <Feather name="share-2" size={20} color={colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.historyTitle, { color: colors.foreground }]} numberOfLines={1}>{m.topic}</Text>
                        <Text style={[s.historySub, { color: colors.mutedForeground }]}>{m.mapData.children?.length || 0} Primary Nodes</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeMindmap(m.id)} style={s.delBtn}>
                        <Feather name="trash-2" size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Map Modal View */}
      <Modal visible={!!activeMap} animationType="slide" transparent>
        <View style={[s.modalOverlay, { backgroundColor: colors.background, paddingTop: insets.top > 0 ? insets.top : 40 }]}>
          <View style={{ flex: 1 }}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[s.modalTitle, { color: colors.foreground }]} numberOfLines={1}>{activeTopic}</Text>
                <Text style={[s.modalSub, { color: colors.accent }]}>NEURAL MAP</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveMap(null)} style={[s.closeBtn, { backgroundColor: colors.muted }]}>
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              ref={horizontalRef}
              style={{ flex: 1 }} 
              showsHorizontalScrollIndicator={false}
              bounces={false}
            >
              <ScrollView 
                ref={verticalRef}
                style={{ flex: 1 }} 
                showsVerticalScrollIndicator={false}
                maximumZoomScale={2.5}
                minimumZoomScale={0.5}
                bouncesZoom={true}
                contentContainerStyle={{ paddingVertical: 40, paddingHorizontal: 20 }}
              >
                {activeMap && <MapNodeVisualizer node={activeMap} colors={colors} />}
              </ScrollView>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    alignItems: "flex-start",
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: -1,
    marginTop: 12,
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
    lineHeight: 22,
  },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    minHeight: 44,
  },
  genBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  historyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  historySub: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    marginTop: 4,
  },
  delBtn: {
    padding: 8,
  },

  modalOverlay: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
    maxWidth: 250,
  },
  modalSub: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Visualizer Styles */
  nodeLevel0: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    shadowColor: "#F59E0B",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 10,
    position: "relative",
  },
  nodeText0: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 18,
  },
  nodeLevel1: {
    backgroundColor: "transparent",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    zIndex: 10,
    position: "relative",
  },
  nodeText1: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  nodeLevel2: {
    backgroundColor: "transparent",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    zIndex: 10,
    position: "relative",
  },
  nodeText2: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  nodeLevel3: {
    backgroundColor: "transparent",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
    position: "relative",
  },
  nodeText3: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  badge: {
    position: "absolute",
    right: -10,
    top: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_800ExtraBold",
  },
  hLine: {
    height: 1,
    width: 30,
    marginLeft: -2,
  },
  vLineContainer: {
    borderLeftWidth: 1,
    paddingLeft: 16,
    marginLeft: 16,
    gap: 16,
    paddingVertical: 10,
  },
  childHLine: {
    height: 1,
    width: 16,
    position: "absolute",
    left: -16,
  },
});
