import React, { useState, useEffect, useRef } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import { Text, ActivityIndicator, useTheme, Surface, ProgressBar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get('window');
const COUNTDOWN_DURATION = 0;

const NewNote = () => {
  const { colors } = useTheme();
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const pulseAnim = new Animated.Value(1);
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [countdownSeconds, setCountdownSeconds] = useState(COUNTDOWN_DURATION);
  const [progress, setProgress] = useState(0);
  const [wasCancelled, setWasCancelled] = useState(false);  // New state to track if countdown was cancelled
  
  // Handle countdown and progress
  useEffect(() => {
    if (isCountingDown) {
      let startTime = Date.now();
      const duration = COUNTDOWN_DURATION * 1000;

      const countdownInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min(elapsed / duration, 1);
        setProgress(newProgress);

        const remainingSeconds = Math.ceil((duration - elapsed) / 1000);
        
        if (remainingSeconds <= 0) {
          clearInterval(countdownInterval);
          setIsCountingDown(false);
          handleStart();  // Start recording automatically after countdown
          setCountdownSeconds(0);
        } else {
          setCountdownSeconds(remainingSeconds);
        }
      }, 10);

      return () => {
        clearInterval(countdownInterval);
        setProgress(0);
      };
    } else if (!wasCancelled && !recognizing) {
      // If countdown ended naturally (not cancelled) and not already recording, start recording
      handleStart();
    }
  }, [isCountingDown]);

  // Rest of useEffects remain the same...
  useEffect(() => {
    let pulseAnimation;
    if (recognizing) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [recognizing]);

  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });
  
  useSpeechRecognitionEvent("end", () => {
    setRecognizing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });
  
  useSpeechRecognitionEvent("result", (event) => {
    setTranscript(event.results[0]?.transcript || "");
  });

  const handleStart = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      console.warn("Permissions not granted", result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  const handleStop = () => {
    ExpoSpeechRecognitionModule.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cancelCountdown = () => {
    setIsCountingDown(false);
    setCountdownSeconds(COUNTDOWN_DURATION);
    setProgress(0);
    setWasCancelled(true);  // Mark that countdown was cancelled
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statusBar}>
        {isCountingDown ? (
          <>
            <Text style={[styles.countdownText, { color: colors.primary }]}>
              Recording starts in {countdownSeconds}...
            </Text>
            <TouchableOpacity
              style={[styles.cancelCountdownButton, { backgroundColor: colors.error }]}
              onPress={cancelCountdown}
            >
              <Text style={styles.cancelCountdownText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.statusText, { color: recognizing ? colors.error : colors.primary }]}>
              {recognizing ? "Listening..." : "Ready to record"}
            </Text>
            {recognizing && (
              <Animated.View 
                style={[
                  styles.recordingIndicator, 
                  { 
                    backgroundColor: colors.error,
                    transform: [{ scale: pulseAnim }] 
                  }
                ]} 
              />
            )}
          </>
        )}
      </View>

      {isCountingDown && (
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progress}
            color={colors.primary}
            style={styles.progressBar}
          />
        </View>
      )}

      <Surface style={styles.transcriptSurface}>
        <ScrollView 
          contentContainerStyle={styles.transcriptScrollview}
          showsVerticalScrollIndicator={false}
        >
          {transcript ? (
            <Text style={styles.transcript}>{transcript}</Text>
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons 
                name="text-to-speech" 
                size={48} 
                color={colors.disabled} 
              />
              <Text style={styles.emptyStateText}>
                {isCountingDown 
                  ? `Recording will start in ${countdownSeconds} seconds...`
                  : "Press the microphone button to start recording your note"
                }
              </Text>
            </View>
          )}
        </ScrollView>
      </Surface>

      <View style={styles.controls}>
        {recognizing && (
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.surface }]}
            onPress={handleStop}
          >
            <MaterialCommunityIcons
              name="cancel"
              size={24}
              color={colors.error}
            />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.micButton, 
            { 
              backgroundColor: recognizing ? colors.error : colors.primary,
              shadowColor: recognizing ? colors.error : colors.primary,
              opacity: isCountingDown ? 0.5 : 1,
            }
          ]}
          onPress={recognizing ? handleStop : handleStart}
          disabled={isCountingDown}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={recognizing ? "microphone-off" : "microphone"}
            size={30}
            color="white"
          />
          {recognizing && (
            <ActivityIndicator 
              size="large" 
              color="white"
              style={styles.recordingActivity}
            />
          )}
        </TouchableOpacity>

        {transcript && !recognizing && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              console.log("Saving note:", transcript);
            }}
          >
            <MaterialCommunityIcons
              name="content-save"
              size={24}
              color="white"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // All existing styles remain the same
  ...StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      width: '100%',
      paddingHorizontal: 30,
      paddingVertical: 20,
      paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 20,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      marginLeft: 5,
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 55,
      marginBottom: 10,
      height: 30, 
    },
    statusText: {
      fontSize: 16,
      marginRight: 8,
      fontWeight: '500',
    },
    recordingIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginLeft: 4,
    },
    transcriptSurface: {
      flex: 1,
      width: width - 40,
      marginHorizontal: 20,
      marginVertical: 15,
      borderRadius: 15,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    transcriptScrollview: {
      padding: 20,
      minHeight: '100%',
    },
    transcript: {
      fontSize: 18,
      lineHeight: 28,
    },
    emptyStateContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
    },
    emptyStateText: {
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
      opacity: 0.6,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
      position: 'relative',
    },
    micButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
      shadowOpacity: 0.35,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 8,
    },
    recordingActivity: {
      position: 'absolute',
      width: '200%',
      height: '200%',
      opacity: 0.2,
    },
    cancelButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 30,
      elevation: 3,
    },
    saveButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 30,
      elevation: 3,
    },
  }),
  
  // Added new styles for countdown features
  countdownText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 40,
    marginTop: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  cancelCountdownButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 10,
  },
  cancelCountdownText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default NewNote;