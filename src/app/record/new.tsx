import React, { useState, useEffect, useRef } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import { Text, ActivityIndicator, useTheme, Surface, ProgressBar, Chip, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get('window');
const COUNTDOWN_DURATION = 0;

const NewTask = () => {
  const { colors } = useTheme();
  const [recognizing, setRecognizing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: title, 1: description, 2: priority (optional)
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: "low" // Default to low priority
  });
  
  const [transcript, setTranscript] = useState("");
  const pulseAnim = new Animated.Value(1);
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [countdownSeconds, setCountdownSeconds] = useState(COUNTDOWN_DURATION);
  const [progress, setProgress] = useState(0);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [skipPriority, setSkipPriority] = useState(false);
  
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

  // Pulse animation effect
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
    setWasCancelled(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // Process current transcript and move to next step
  const processCurrentStep = () => {
    if (transcript) {
      // Update the appropriate field based on current step
      setTaskData(prevData => {
        const newData = { ...prevData };
        
        if (currentStep === 0) {
          newData.title = transcript;
        } else if (currentStep === 1) {
          newData.description = transcript;
        } else if (currentStep === 2) {
          // Process priority based on spoken input
          const lowPriorityKeywords = ['low', 'minor', 'not urgent', 'can wait'];
          const highPriorityKeywords = ['high', 'urgent', 'important', 'critical', 'asap'];
          const mediumPriorityKeywords = ['medium', 'normal', 'standard', 'moderate'];
          
          const lowerTranscript = transcript.toLowerCase();
          
          if (lowPriorityKeywords.some(keyword => lowerTranscript.includes(keyword))) {
            newData.priority = 'low';
          } else if (highPriorityKeywords.some(keyword => lowerTranscript.includes(keyword))) {
            newData.priority = 'high';
          } else if (mediumPriorityKeywords.some(keyword => lowerTranscript.includes(keyword))) {
            newData.priority = 'medium';
          } else {
            newData.priority = 'low'; // Default to low if no clear indication
          }
        }
        
        return newData;
      });
    }
    
    // Clear transcript for next step
    setTranscript("");
    
    // Move to next step or finish
    if (currentStep < 1 || (currentStep === 1 && !skipPriority)) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete task creation
      console.log("Task created:", taskData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentStep(3); // Move to final summary
    }
  };

  const skipToPriority = () => {
    if (taskData.title) {
      setTaskData(prevData => ({
        ...prevData,
        description: transcript || ""
      }));
      setTranscript("");
      setCurrentStep(2);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const skipToSummary = () => {
    if (currentStep === 2) {
      // Keep default priority (low) and move to summary
      setCurrentStep(3);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Get step-specific UI elements
  const getStepLabel = () => {
    switch (currentStep) {
      case 0:
        return "Recording Task Title";
      case 1:
        return "Recording Task Description";
      case 2:
        return "Recording Task Priority";
      default:
        return "Task Summary";
    }
  };

  const getStepInstructions = () => {
    switch (currentStep) {
      case 0:
        return "Speak a brief title for your task";
      case 1:
        return "Describe your task in detail (skip if not needed)";
      case 2:
        return "Say 'high', 'medium', or 'low' to set priority (skip for low)";
      default:
        return "";
    }
  };

  const renderTaskSummary = () => {
    if (currentStep === 3) {
      return (
        <View style={styles.taskSummary}>
          <Text style={styles.summaryHeader}>Task Summary:</Text>
          <Text style={styles.summaryTitle}>{taskData.title}</Text>
          <Text style={styles.summaryDescription}>{taskData.description || "No description provided"}</Text>
          <View style={styles.priorityContainer}>
            <Text style={styles.priorityLabel}>Priority: </Text>
            <Chip 
              style={[
                styles.priorityChip, 
                { 
                  backgroundColor: 
                    taskData.priority === 'high' ? colors.error : 
                    taskData.priority === 'medium' ? colors.primary : 
                    colors.accent 
                }
              ]}
            >
              {taskData.priority.toUpperCase()}
            </Chip>
          </View>
        </View>
      );
    }
    return null;
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
              {recognizing ? `${getStepLabel()}...` : `${getStepLabel()}`}
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
          {currentStep === 3 ? (
            renderTaskSummary()
          ) : transcript ? (
            <>
              <Text style={styles.transcript}>{transcript}</Text>
              {currentStep === 1 && !recognizing && (
                <Button 
                  mode="text" 
                  onPress={skipToPriority}
                  style={styles.skipButton}
                >
                  Skip to Priority
                </Button>
              )}
              {currentStep === 2 && !recognizing && (
                <Button 
                  mode="text" 
                  onPress={skipToSummary}
                  style={styles.skipButton}
                >
                  Skip (Set Low Priority)
                </Button>
              )}
            </>
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons 
                name={
                  currentStep === 0 ? "format-title" : 
                  currentStep === 1 ? "text-box-outline" : 
                  "flag-variant"
                } 
                size={48} 
                color={colors.disabled} 
              />
              <Text style={styles.emptyStateText}>
                {isCountingDown 
                  ? `Recording will start in ${countdownSeconds} seconds...`
                  : getStepInstructions()
                }
              </Text>
              {currentStep > 0 && (
                <View style={styles.previousInputs}>
                  {taskData.title && (
                    <View style={styles.previousInput}>
                      <Text style={styles.previousInputLabel}>Title:</Text>
                      <Text style={styles.previousInputValue}>{taskData.title}</Text>
                    </View>
                  )}
                  {currentStep > 1 && taskData.description && (
                    <View style={styles.previousInput}>
                      <Text style={styles.previousInputLabel}>Description:</Text>
                      <Text 
                        style={styles.previousInputValue}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {taskData.description}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Skip buttons when transcript is empty */}
              {currentStep === 1 && !recognizing && (
                <Button 
                  mode="outlined" 
                  onPress={skipToPriority}
                  style={[styles.skipButtonEmpty, { borderColor: colors.primary }]}
                  labelStyle={{ color: colors.primary }}
                >
                  Skip Description
                </Button>
              )}
              {currentStep === 2 && !recognizing && (
                <Button 
                  mode="outlined" 
                  onPress={skipToSummary}
                  style={[styles.skipButtonEmpty, { borderColor: colors.primary }]}
                  labelStyle={{ color: colors.primary }}
                >
                  Use Low Priority
                </Button>
              )}
            </View>
          )}
          
          {/* Display step indicator */}
          <View style={styles.stepIndicator}>
            <View 
              style={[
                styles.stepLine,
                { backgroundColor: currentStep > 0 ? colors.primary : colors.disabled }
              ]}
            />
            <View 
              style={[
                styles.stepLine,
                { backgroundColor: currentStep > 1 ? colors.primary : colors.disabled }
              ]}
            />
            <View 
              style={[
                styles.stepLine,
                { backgroundColor: currentStep > 2 ? colors.primary : colors.disabled }
              ]}
            />
            <View 
              style={[
                styles.stepDot,
                { backgroundColor: currentStep >= 0 ? colors.primary : colors.disabled }
              ]}
            />
            <View 
              style={[
                styles.stepDot,
                { backgroundColor: currentStep >= 1 ? colors.primary : colors.disabled }
              ]}
            />
            <View 
              style={[
                styles.stepDot,
                { backgroundColor: currentStep >= 2 ? colors.primary : colors.disabled }
              ]}
            />
            <View 
              style={[
                styles.stepDot,
                { backgroundColor: currentStep >= 3 ? colors.primary : colors.disabled }
              ]}
            />
          </View>
        </ScrollView>
      </Surface>

      <View style={styles.controls}>
        {currentStep < 3 && (
          <>
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
                style={[styles.nextButton, { backgroundColor: colors.primary }]}
                onPress={processCurrentStep}
              >
                <MaterialCommunityIcons
                  name={currentStep < 2 ? "arrow-right" : "check"}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            )}
          </>
        )}
        
        {currentStep === 3 && (
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              // Here you would save the task to a database/store
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Reset component to initial state
              setCurrentStep(0);
              setTaskData({
                title: "",
                description: "",
                priority: "low"
              });
              setTranscript("");
              setSkipPriority(false);
            }}
          >
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color="white"
            />
            <Text style={styles.doneButtonText}>Save Task</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // All existing styles remain the same
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
    position: 'relative',
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
  nextButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 30,
    elevation: 3,
  },
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
  
  // New styles for multi-step task recording
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  stepLine: {
    height: 3,
    width: 20,
    marginHorizontal: -2,
  },
  previousInputs: {
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 15,
  },
  previousInput: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  previousInputLabel: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 14,
  },
  previousInputValue: {
    fontSize: 14,
    opacity: 0.8,
  },
  taskSummary: {
    padding: 20,
  },
  summaryHeader: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  summaryDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  priorityLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  priorityChip: {
    height: 30,
  },
  doneButton: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  doneButtonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  skipButton: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
  skipButtonEmpty: {
    marginTop: 20,
    borderWidth: 1,
  },
});

export default NewTask;