import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export function GradientText({
  children,
  style,
}: {
  children: string;
  style?: TextStyle;
}) {
  const colors = useColors();
  // RN doesn't support text gradients without masked-view; approximate with primary color.
  return (
    <Text style={[{ color: colors.primary }, style]}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          padding: padded ? 16 : 0,
          shadowColor: "#0F172B",
          shadowOpacity: 0.04,
          shadowOffset: { width: 0, height: 6 },
          shadowRadius: 16,
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
  fullWidth = true,
  size = "md",
}: {
  label: string;
  onPress?: PressableProps["onPress"];
  variant?: ButtonVariant;
  icon?: React.ComponentProps<typeof Feather>["name"];
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const colors = useColors();
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";
  const isDestructive = variant === "destructive";

  const bg = isPrimary
    ? colors.primary
    : isSecondary
      ? colors.secondary
      : isDestructive
        ? colors.destructive
        : "transparent";
  const fg = isPrimary || isDestructive
    ? colors.primaryForeground
    : isSecondary
      ? colors.secondaryForeground
      : colors.foreground;

  const heights = { sm: 38, md: 50, lg: 56 };
  const fontSizes = { sm: 13, md: 15, lg: 16 };
  const horizontalPadding = { sm: 14, md: 22, lg: 28 };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: heights[size],
          paddingHorizontal: horizontalPadding[size],
          borderRadius: 999,
          backgroundColor: bg,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          borderWidth: isGhost ? 1 : 0,
          borderColor: colors.border,
          transform: pressed ? [{ scale: 0.98 }] : [],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon && <Feather name={icon} size={size === "sm" ? 14 : 17} color={fg} />}
          <Text
            style={{
              color: fg,
              fontFamily: "Inter_600SemiBold",
              fontSize: fontSizes[size],
              letterSpacing: -0.1,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function GradientButton({
  label,
  onPress,
  icon,
  loading,
  disabled,
  size = "md",
  style,
}: {
  label: string;
  onPress?: PressableProps["onPress"];
  icon?: React.ComponentProps<typeof Feather>["name"];
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}) {
  const colors = useColors();
  const heights = { sm: 38, md: 52, lg: 58 };
  const fontSizes = { sm: 13, md: 15, lg: 16 };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: heights[size],
          borderRadius: 999,
          overflow: "hidden",
          opacity: disabled ? 0.5 : 1,
          transform: pressed ? [{ scale: 0.98 }] : [],
          shadowColor: colors.primary,
          shadowOpacity: 0.25,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 16,
          elevation: 4,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 22,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            {icon && <Feather name={icon} size={17} color="#fff" />}
            <Text
              style={{
                color: "#fff",
                fontFamily: "Inter_700Bold",
                fontSize: fontSizes[size],
                letterSpacing: -0.1,
              }}
            >
              {label}
            </Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function Pill({
  label,
  icon,
  color,
  background,
  style,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  color?: string;
  background?: string;
  style?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: background ?? colors.secondary,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={11} color={color ?? colors.secondaryForeground} />}
      <Text
        style={{
          color: color ?? colors.secondaryForeground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          letterSpacing: 0.2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
  onActionPress,
}: {
  title: string;
  action?: string;
  onActionPress?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={{
          color: colors.foreground,
          fontFamily: "Inter_700Bold",
          fontSize: 18,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
      {action && (
        <Pressable onPress={onActionPress} hitSlop={10}>
          <Text
            style={{
              color: colors.primary,
              fontFamily: "Inter_600SemiBold",
              fontSize: 13,
            }}
          >
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  cta,
  onCtaPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  cta?: string;
  onCtaPress?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.empty}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          backgroundColor: colors.secondary,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Feather name={icon} size={26} color={colors.primary} />
      </View>
      <Text
        style={{
          color: colors.foreground,
          fontFamily: "Inter_700Bold",
          fontSize: 17,
          marginBottom: 6,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.mutedForeground,
          fontFamily: "Inter_400Regular",
          fontSize: 14,
          textAlign: "center",
          lineHeight: 20,
          maxWidth: 280,
          marginBottom: cta ? 20 : 0,
        }}
      >
        {subtitle}
      </Text>
      {cta && <Button label={cta} onPress={onCtaPress} fullWidth={false} />}
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.foreground,
            fontFamily: "Inter_800ExtraBold",
            fontSize: 30,
            letterSpacing: -1,
          }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={{
              color: colors.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 14,
              marginTop: 4,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

export function ProgressBar({
  value,
  max = 100,
  color,
  height = 6,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}) {
  const colors = useColors();
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <View
      style={{
        height,
        backgroundColor: colors.muted,
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${pct * 100}%`,
          backgroundColor: color ?? colors.primary,
          borderRadius: 999,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
});
