import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type EmptyStateProps = {
  icon?: string;
  title: string;
  message: string;
  iconSize?: number;
  iconColor?: string;
  containerStyle?: object;
};

const EmptyState = ({
  icon = "fitness-outline",
  title,
  message,
  iconSize = 80,
  iconColor = "#A08249",
  containerStyle,
}: EmptyStateProps) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name={icon} size={iconSize} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#FCFAF7",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1C160C",
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: "#9E7A47",
    textAlign: "center",
    lineHeight: 22,
  },
});

export default EmptyState;
