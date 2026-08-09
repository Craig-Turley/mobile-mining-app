import React, { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

export function NativeSpinner() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[
      {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: "#ccc",
        borderTopColor: "#333",
      },
      , { transform: [{ rotate }] }]} />
  );
}
