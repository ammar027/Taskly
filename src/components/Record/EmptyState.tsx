import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export const EmptyState = ({ isDarkMode, colors, theme, getStepInstructions, handleStart, recognizing, currentStep, isEditing }) => (
  <View style={styles.emptyStateContainer}>
    <MaterialCommunityIcons
      name="text-box-plus-outline"
      size={48}
      color={isDarkMode ? "#6B7280" : colors.disabled}
    />
    <Text style={[styles.emptyStateText, { color: theme.secondaryText }]}>
      {getStepInstructions()}
    </Text>

    {!recognizing && currentStep === 0 && !isEditing && (
      <TouchableOpacity
        style={[styles.startPromptButton, { backgroundColor: colors.primary }]}
        onPress={handleStart}
      >
        <MaterialCommunityIcons name="microphone" size={20} color="white" />
        <Text style={styles.startPromptText}>Starting Automatically...</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  emptyStateContainer: { 
    alignItems: "center", 
    justifyContent: "center", 
    padding: 24 
  },
  emptyStateText: { 
    fontSize: 17, 
    textAlign: "center", 
    marginTop: 16, 
    fontWeight: "500", 
    maxWidth: "80%" 
  },
  startPromptButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 24, 
    marginTop: 20, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 2 
  },
  startPromptText: { 
    marginLeft: 10, 
    color: "white", 
    fontWeight: "600", 
    fontSize: 15 
  },
});