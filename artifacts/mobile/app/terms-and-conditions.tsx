import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import Markdown from "react-native-markdown-display";

const termsMarkdown = `
# TERMS & CONDITIONS
**Effective Date:** June 2026

## 1. Acknowledgment and Acceptance
These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms set out the rights and obligations of all users regarding the use of the Service.

Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions. These Terms apply to all visitors, users, and others who access or use the Service (including the Web, iOS, and Android applications).

By accessing or using the Service You agree to be bound by these Terms and Conditions. If You disagree with any part of these Terms and Conditions then You may not access the Service.

## 2. Accounts and Subscriptions
When You create an account with Us, You must provide Us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of Your account on Our Service.

You are responsible for safeguarding the password that You use to access the Service and for any activities or actions under Your password.

### Credit Ledger System
PrepAssist operates on a dynamic computational Credit Ledger. 
* Free-tier users are granted an initial seed of Credits.
* Performing advanced AI generation (like Mains Evaluation or PDF Vectorization) deducts Credits mathematically based on token consumption.
* Purchased Credits are non-refundable once consumed by the AI engines.

## 3. Intellectual Property Rights
The Service and its original content (excluding Content provided by You), features and functionality are and will remain the exclusive property of the Company and its licensors. The Service is protected by copyright, trademark, and other laws of both the Country and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of the Company.

**Your Intellectual Property:** You retain full ownership and intellectual property rights over any personal study materials, notes, or essays you upload to the platform. 

## 4. Acceptable Use Policy
You agree not to use the Service:
1. In any way that violates any applicable national or international law or regulation.
2. For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way.
3. To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.
4. To reverse-engineer our AI assessment pipelines or maliciously inject corrupted vectors into our Pinecone arrays.

## 5. AI Generation Disclaimer
Our Service utilizes advanced Large Language Models (LLMs) to generate quizzes, summaries, and evaluate essays. While we strive for absolute precision against UPSC rubrics, **PrepAssist does not guarantee 100% factual accuracy in AI-generated responses.** 
* The Service is designed as an educational assistant, not a definitive source of truth.
* You are explicitly advised to cross-reference critical data with official UPSC guidelines and NCERT textbooks.
* The Company shall not be held liable for any loss of marks, failed examinations, or career impacts resulting from reliance on the AI-generated evaluations.

## 6. Termination
We may terminate or suspend Your Account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms and Conditions. Upon termination, Your right to use the Service will cease immediately.

## 7. Limitation of Liability
Notwithstanding any damages that You might incur, the entire liability of the Company and any of its suppliers under any provision of this Terms and Your exclusive remedy for all of the foregoing shall be limited to the amount actually paid by You through the Service.

To the maximum extent permitted by applicable law, in no event shall the Company or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, loss of data or other information, for business interruption, for personal injury) arising out of or in any way related to the use of or inability to use the Service.

## 8. Governing Law
The laws of the Country, excluding its conflicts of law rules, shall govern this Terms and Your use of the Service. Your use of the Application may also be subject to other local, state, national, or international laws.

## 9. Contact Us
If you have any questions about these Terms and Conditions, You can contact us via the Support Widget within the PrepAssist Dashboard or by reaching out to our administrative team.
`;

export default function TermsAndConditionsScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Terms & Conditions</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Markdown 
          style={{ 
            body: { color: colors.foreground, fontSize: 15, lineHeight: 24 }, 
            heading1: { color: colors.foreground, fontFamily: "Inter_800ExtraBold", fontSize: 28, lineHeight: 36, marginTop: 10, marginBottom: 10 }, 
            heading2: { color: colors.foreground, fontFamily: "Inter_700Bold", marginTop: 16, marginBottom: 8 },
            heading3: { color: colors.foreground, fontFamily: "Inter_600SemiBold", marginTop: 12, marginBottom: 6 },
            strong: { fontFamily: "Inter_700Bold" },
            list_item: { marginBottom: 8 }
          }}
        >
          {termsMarkdown}
        </Markdown>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(150,150,150,0.1)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontFamily: "Inter_800ExtraBold" },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  content: { padding: 20 },
});
