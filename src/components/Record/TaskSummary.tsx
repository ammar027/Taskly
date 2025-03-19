import React from "react";
import { View, StyleSheet } from "react-native";
import { Surface, Text, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export const TaskSummary = ({ theme, colors, taskData, autoSaving, saveCountdown }) => (
  <View style={styles.taskSummary}>
    <Surface style={[styles.summaryCard, { backgroundColor: theme.cardBg }]}>
      <View style={[styles.summaryHeader, { backgroundColor: theme.cardHeader }]}>
        <Text style={[styles.summaryHeaderText, { color: theme.headerTitle }]}>
          Task Ready
        </Text>
      </View>
      <View style={styles.titleContainer}>
        <MaterialCommunityIcons
          name="checkbox-marked-circle-outline"
          size={22}
          color={colors.primary}
          style={styles.titleIcon}
        />
        <Text style={[styles.summaryTitle, { color: theme.text }]}>{taskData.title}</Text>
      </View>
      <View style={styles.metaContainer}>
        <View style={[styles.dateContainer, { backgroundColor: theme.dateContainerBg, borderColor: theme.dateBorder }]}>
          <MaterialCommunityIcons name="calendar-clock" size={20} color={theme.secondaryText} />
          <Text style={[styles.dateText, { color: theme.secondaryText }]}>
            {new Date().toLocaleDateString(undefined, {
              weekday: "short", month: "short", day: "numeric",
            })}
          </Text>
        </View>
      </View>
      {autoSaving && (
        <View style={[styles.autoSaveIndicator, { backgroundColor: theme.autoSaveBg, borderTopColor: theme.autoSaveBorder }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.autoSaveText, { color: theme.secondaryText }]}>
            Saving automatically in {saveCountdown}...
          </Text>
        </View>
      )}
    </Surface>
  </View>
);

const styles = StyleSheet.create({
  taskSummary: { alignItems: "center", width: "100%", paddingVertical: 10 },
  summaryCard: { width: "100%", borderRadius: 20, overflow: "hidden", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  summaryHeader: { padding: 18, borderBottomWidth: 1, borderBottomColor: "rgba(226, 232, 240, 0.8)", backgroundColor: "rgba(59, 130, 246, 0.08)" },
  summaryHeaderText: { fontSize: 20, fontWeight: "700", textAlign: "center", letterSpacing: -0.5, color: "#1E40AF" },
  titleContainer: { flexDirection: "row", alignItems: "flex-start", padding: 20, paddingBottom: 16 },
  titleIcon: { marginRight: 14, marginTop: 2 },
  summaryTitle: { fontSize: 22, fontWeight: "600", flex: 1, lineHeight: 28 },
  metaContainer: { padding: 20, paddingTop: 0, paddingBottom: 24 },
  dateContainer: { flexDirection: "row", alignItems: "center", marginBottom: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "rgba(243, 255, 239, 0.84)", borderRadius: 12, borderWidth: 0.5, borderColor: "light-grey", alignSelf: "flex-start" },
  dateText: { marginLeft: 10, fontSize: 15, fontWeight: "500", color: "#475569" },
  autoSaveIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, backgroundColor: "rgba(240, 245, 250, 0.8)", borderTopWidth: 1, borderTopColor: "rgba(226, 232, 240, 0.8)" },
  autoSaveText: { marginLeft: 10, fontSize: 15, fontWeight: "500", color: "#475569" },
});