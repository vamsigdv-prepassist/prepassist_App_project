import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function IndexRoute() {
  const { user, loading } = useAuth();
  const colors = useColors();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
