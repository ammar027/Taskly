import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export const FinalButtons = ({ 
  theme, 
  colors, 
  setCurrentStep, 
  taskData, 
  setTranscript, 
  setCurrentAction, 
  setAutoSaving, 
  setIsEditing, 
  saveTaskAndNavigate 
}) => (
  <View style={styles.finalButtons}>
    <TouchableOpacity
      style={[styles.finalButton, { backgroundColor: theme.surface, borderColor: colors.primary, borderWidth: 1 }]}
      onPress={() => {
        setCurrentStep(0);
        setTranscript(taskData.title);
        setCurrentAction("Editing task title...");
        setAutoSaving(false);
        setIsEditing(true);
      }}
    >
      <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
      <Text style={[styles.finalButtonText, { color: colors.primary }]}>Edit Title</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.finalButton, { backgroundColor: colors.primary }]}
      onPress={() => {
        setAutoSaving(false);
        saveTaskAndNavigate();
      }}
    >
      <MaterialCommunityIcons name="check-circle" size={20} color="white" />
      <Text style={styles.finalButtonText}>Save Task</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  finalButtons: { 
    flexDirection: "row", 
    justifyContent: "space-around", 
    width: "100%", 
    paddingHorizontal: 16 
  },
  finalButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 14, 
    paddingHorizontal: 22, 
    borderRadius: 16, 
    minWidth: width * 0.4, 
    elevation: 2, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3 
  },
  finalButtonText: { 
    marginLeft: 8, 
    fontSize: 16, 
    fontWeight: "600", 
    color: "white" 
  },
});