import React from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

export const VoiceControls = ({ 
  theme, 
  isEditing, 
  recognizing, 
  autoConfirmCountdown, 
  recordingTime, 
  handleStop, 
  handleStart, 
  colors 
}) => (
  <>
    <View style={[styles.voiceHints, { backgroundColor: theme.voiceHintBg, borderColor: theme.voiceHintBorder }]}>
      <Text style={[styles.voiceHintText, { color: theme.secondaryText }]}>
        {isEditing
          ? "Speak new title - will auto-confirm when you stop speaking"
          : recognizing
            ? autoConfirmCountdown
              ? `Auto-confirming in ${autoConfirmCountdown}s...`
              : `Speaking (${recordingTime}s)`
            : "Tap microphone and speak your task title"}
      </Text>
    </View>
    <TouchableOpacity
      style={[styles.micButton, {
        backgroundColor: recognizing ? colors.error : colors.primary,
        shadowColor: recognizing ? colors.error : colors.primary,
      }]}
      onPress={recognizing ? handleStop : handleStart}
      accessibilityLabel={recognizing ? "Stop recording" : "Start recording"}
      accessibilityHint="Double tap to toggle voice recording"
      accessibilityRole="button"
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={recognizing ? "microphone-off" : "microphone"} size={30} color="white" />
      {recognizing && <ActivityIndicator size="large" color="white" style={styles.recordingActivity} />}
    </TouchableOpacity>
  </>
);

const styles = StyleSheet.create({
  micButton: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    alignItems: "center", 
    justifyContent: "center", 
    shadowOffset: { width: 0, height: 3 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 8, 
    elevation: 6 
  },
  recordingActivity: { position: "absolute", width: 100, height: 100 },
  voiceHints: { 
    marginBottom: 20, 
    padding: 14, 
    borderRadius: 16, 
    backgroundColor: "rgba(236, 242, 250, 0.8)", 
    maxWidth: width * 0.85, 
    borderWidth: 1, 
    borderColor: "rgba(200, 220, 240, 0.5)" 
  },
  voiceHintText: { textAlign: "center", fontSize: 15, fontWeight: "500", opacity: 0.75 },
});