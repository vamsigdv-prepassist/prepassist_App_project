import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator, Image } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function IndexRoute() {
  const { user, loading } = useAuth();
  const colors = useColors();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <Image 
           source={require('@/assets/images/brand-logo-new.png')} 
           style={{ width: 120, height: 120, resizeMode: 'contain' }} 
        />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
