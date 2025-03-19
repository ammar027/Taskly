import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native-paper";
import { Animated } from "react-native";

export const Header = ({ router, params, theme, recognizing, recordingTime, getStepLabel, colors }) => (
  <View style={[styles.headerContainer, { borderBottomColor: theme.divider }]}>
    <Pressable
      style={[styles.backButton, { backgroundColor: theme.backButtonBg }]}
      onPress={() => {
        router.replace({
          pathname: "/(tabs)",
          params: params.returnToTabs === "true" ? { returnedFromRecord: "true" } : undefined,
        })
      }}
    >
      <Ionicons name="arrow-back" size={27} color={theme.text} />
    </Pressable>

    <View style={styles.statusIndicator}>
      {recognizing && (
        <>
          <Animated.View
            style={[styles.recordingIndicator, { backgroundColor: colors.error }]}
          />
          <Text style={{ color: colors.error, marginRight: 5 }}>{recordingTime}s</Text>
        </>
      )}
      <Text style={[styles.statusText, { color: recognizing ? colors.error : colors.primary }]}>
        {getStepLabel()}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  headerContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 16, 
    paddingBottom: 12, 
    borderBottomWidth: 1 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  statusIndicator: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: 40 
  },
  recordingIndicator: { 
    width: 12, 
    height: 12, 
    borderRadius: 6, 
    marginRight: 10 
  },
  statusText: { 
    fontSize: 20, 
    fontWeight: "800" 
  },
});