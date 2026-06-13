import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { PanResponder, Platform, View } from "react-native";

export function EdgeSwipeBack({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const historyRef = useRef<string[]>([]);

  useEffect(() => {
    if (pathname && !pathname.includes("login")) {
      // Don't add consecutive duplicate paths
      if (historyRef.current[historyRef.current.length - 1] !== pathname) {
        historyRef.current.push(pathname);
        if (historyRef.current.length > 20) {
          historyRef.current.shift();
        }
      }
    }
  }, [pathname]);

  const handleBack = () => {
    if (historyRef.current.length > 1) {
      historyRef.current.pop(); // remove current page
      const prev = historyRef.current.pop(); // remove prev page so it gets re-added properly by useEffect
      if (prev) {
        router.navigate(prev as any);
        return;
      }
    } else if (pathname !== "/") {
      router.navigate("/");
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        // Capture horizontal swipes from the left edge
        return (
          Platform.OS === "ios" &&
          evt.nativeEvent.pageX < 40 &&
          gestureState.dx > 15 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          handleBack();
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
