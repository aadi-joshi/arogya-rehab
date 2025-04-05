import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
  containerStyle?: object;
};

const ErrorMessage = ({ message, onRetry, containerStyle }: ErrorMessageProps) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name="alert-circle-outline" size={40} color="#F99E16" />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF5E9",
    borderRadius: 12,
    margin: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#161411",
    textAlign: "center",
    marginVertical: 12,
  },
  retryButton: {
    backgroundColor: "#F99E16",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: "#21160A",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ErrorMessage;
