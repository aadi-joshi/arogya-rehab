import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";

type SuccessFeedbackProps = {
  title: string;
  message?: string;
  onAnimationFinish?: () => void;
  animation?: "checkmark" | "confetti" | "none";
};

const SuccessFeedback = ({
  title,
  message,
  onAnimationFinish,
  animation = "checkmark",
}: SuccessFeedbackProps) => {
  const scale = new Animated.Value(0);
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    if (onAnimationFinish) {
      const timer = setTimeout(() => {
        onAnimationFinish();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          { transform: [{ scale }], opacity },
        ]}
      >
        {animation === "checkmark" && (
          <Ionicons name="checkmark-circle" size={80} color="green" />
        )}
        {animation === "confetti" && (
          <LottieView
            source={require("../assets/success_animation.json")}
            autoPlay
            loop={false}
            style={styles.lottie}
            onAnimationFinish={onAnimationFinish}
          />
        )}
      </Animated.View>
      <Animated.Text style={[styles.title, { opacity }]}>
        {title}
      </Animated.Text>
      {message && (
        <Animated.Text style={[styles.message, { opacity }]}>
          {message}
        </Animated.Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 24,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#21160A",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: "#9E7A47",
    textAlign: "center",
    marginTop: 8,
  },
  lottie: {
    width: 200,
    height: 200,
  },
});

export default SuccessFeedback;
