import React, { useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import { Text, ActivityIndicator, useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const NewNote = () => {
  const { colors } = useTheme();
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");

  useSpeechRecognitionEvent("start", () => setRecognizing(true));
  useSpeechRecognitionEvent("end", () => setRecognizing(false));
  useSpeechRecognitionEvent("result", (event) => {
    setTranscript(event.results[0]?.transcript || "");
  });

  const handleStart = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      console.warn("Permissions not granted", result);
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>Speech to Text</Text>

      <ScrollView contentContainerStyle={styles.transcriptContainer}>
        {recognizing ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <Text style={styles.transcript}>{transcript || "Press the mic to start..."}</Text>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.micButton, { backgroundColor: recognizing ? "red" : colors.primary }]}
        onPress={recognizing ? () => ExpoSpeechRecognitionModule.stop() : handleStart}
      >
        <MaterialCommunityIcons
          name={recognizing ? "microphone-off" : "microphone"}
          size={30}
          color="white"
        />
      </TouchableOpacity>
    </View>
  );
};

export default NewNote;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  transcriptContainer: {
    flex: 1,
    width: "100%",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  transcript: {
    fontSize: 18,
    textAlign: "center",
    paddingHorizontal: 20,
    color: "#555",
  },
  micButton: {
    position: "absolute",
    bottom: 40,
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
});
