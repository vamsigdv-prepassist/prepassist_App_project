import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import * as Google from "expo-auth-session/providers/google";

type Mode = "signin" | "signup";

export default function LoginScreen() {
  const colors = useColors();
  const { signIn, signUp, signInWithGoogleIdToken } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signedUpOk, setSignedUpOk] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "YOUR_WEB_CLIENT_ID",
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      if (id_token) {
        setLoading(true);
        signInWithGoogleIdToken(id_token).then((err) => {
          if (err) setError(err);
          setLoading(false);
        });
      }
    } else if (response?.type === "error") {
      setError(response.error?.message ?? "Google Sign-In Error");
    }
  }, [response]);

  async function handleSubmit() {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (mode === "signin") {
      const err = await signIn(email.trim(), password);
      if (err) {
        setError(err);
      } else {
        router.replace("/(tabs)/" as any);
      }
    } else {
      const err = await signUp(email.trim(), password, name.trim());
      if (err) {
        setError(err);
      } else {
        setSignedUpOk(true);
      }
    }
    setLoading(false);
  }

  if (signedUpOk) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: colors.background }]}>
        <View style={s.center}>
          <View style={[s.successIcon, { backgroundColor: "#10B981" + "20" }]}>
            <Feather name="check-circle" size={48} color="#10B981" />
          </View>
          <Text style={[s.successTitle, { color: colors.foreground }]}>
            Account created!
          </Text>
          <Text style={[s.successSub, { color: colors.mutedForeground }]}>
            Check your email and click the confirmation link, then sign in.
          </Text>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.primary, marginTop: 24 }]}
            onPress={() => { setSignedUpOk(false); setMode("signin"); }}
          >
            <Text style={s.btnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Hero */}
        <LinearGradient
          colors={["#4F39F6", "#5B8DEF", "#06B6D4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <Text style={s.brand}>PrepAssist</Text>
          <Text style={s.heroSub}>UPSC Preparation Platform</Text>
        </LinearGradient>

        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Mode toggle */}
          <View style={[s.modeRow, { backgroundColor: colors.muted }]}>
            {(["signin", "signup"] as Mode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[
                  s.modeBtn,
                  m === mode && { backgroundColor: colors.background },
                ]}
                onPress={() => { setMode(m); setError(""); }}
              >
                <Text
                  style={[
                    s.modeBtnText,
                    { color: m === mode ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  {m === "signin" ? "Sign In" : "Create Account"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.title, { color: colors.foreground }]}>
            {mode === "signin" ? "Welcome back" : "Join PrepAssist"}
          </Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            {mode === "signin"
              ? "Your notes sync across all your devices."
              : "Create an account to sync notes on web & app."}
          </Text>

          {/* Name — signup only */}
          {mode === "signup" && (
            <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Feather name="user" size={16} color={colors.mutedForeground} style={s.inputIcon} />
              <TextInput
                style={[s.input, { color: colors.foreground }]}
                placeholder="Full name"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Email */}
          <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Feather name="mail" size={16} color={colors.mutedForeground} style={s.inputIcon} />
            <TextInput
              style={[s.input, { color: colors.foreground }]}
              placeholder="Email address"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          {/* Password */}
          <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} style={s.inputIcon} />
            <TextInput
              style={[s.input, { color: colors.foreground, flex: 1 }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={s.eyeBtn}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error ? (
            <View style={[s.errorBox, { backgroundColor: "#DC2626" + "12" }]}>
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>
                {mode === "signin" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>

          <View style={s.dividerWrap}>
            <View style={[s.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[s.dividerText, { color: colors.mutedForeground, backgroundColor: colors.background }]}>OR</Text>
          </View>

          {/* Google Sign In */}
          <TouchableOpacity
            style={[s.googleBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              promptAsync();
            }}
            disabled={!request || loading}
          >
            <Feather name="globe" size={18} color={colors.foreground} style={s.googleIcon} />
            <Text style={[s.googleBtnText, { color: colors.foreground }]}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Skip / continue without account */}
          <TouchableOpacity
            style={s.skipBtn}
            onPress={() => router.replace("/(tabs)/" as any)}
          >
            <Text style={[s.skipText, { color: colors.mutedForeground }]}>
              Continue without account
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 48,
    alignItems: "center",
  },
  brand: {
    fontSize: 32,
    fontFamily: "Inter_800ExtraBold",
    color: "#fff",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    padding: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    gap: 12,
  },
  modeRow: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: "center",
  },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 4 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15 },
  eyeBtn: { padding: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 10,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#DC2626", flex: 1 },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  dividerWrap: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { marginHorizontal: 12, fontSize: 12, fontFamily: "Inter_600SemiBold", paddingHorizontal: 4 },
  googleBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: { marginRight: 8 },
  googleBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  skipBtn: { alignItems: "center", paddingVertical: 10 },
  skipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  successIcon: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});
