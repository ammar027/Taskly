import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export const TranscriptView = ({ transcript, theme, colors }) => (
  <View style={[styles.transcriptContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
    <MaterialCommunityIcons name="format-quote-open" size={24} color={colors.primary} style={styles.quoteIcon} />
    <Text style={[styles.transcript, { color: theme.text }]}>{transcript}</Text>
    <MaterialCommunityIcons name="format-quote-close" size={24} color={colors.primary} style={styles.quoteIcon} />
  </View>
);

const styles = StyleSheet.create({
  transcriptContainer: { 
    alignItems: "center", 
    justifyContent: "center", 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1 
  },
  transcript: { 
    fontSize: 22, 
    fontWeight: "600", 
    textAlign: "center", 
    lineHeight: 32, 
    letterSpacing: -0.3 
  },
  quoteIcon: { 
    alignSelf: "center", 
    marginVertical: 8, 
    opacity: 0.5 
  },
});