import React, { useState, useEffect, useRef } from "react"
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Pressable,
  Animated
} from "react-native"
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition"
import { useSpeechRecognitionEvent } from "expo-speech-recognition"
import { Text, ActivityIndicator, useTheme as usePaperTheme, Surface, Chip, Button } from "react-native-paper"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { StatusBar } from "expo-status-bar"
import LottieView from "lottie-react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTheme } from "@/components/ThemeContext"

const { width } = Dimensions.get("window")
const SPEECH_TIMEOUT = 2500
const AUTO_SAVE_COUNTDOWN = 5 // 5 seconds for auto-save

const NewTask = () => {
  const { colors } = usePaperTheme()
  const { isDarkMode } = useTheme() // Access dark mode state
  const router = useRouter()
  const params = useLocalSearchParams<{
    content: string
    priority: string
    assistantRequest: string
    autoStart: string
  }>()
  const [recognizing, setRecognizing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0) // 0: title, 1: summary
  const [taskData, setTaskData] = useState({
    title: "",
    priority: params.priority || "",
    created: null,
  })
  const [transcript, setTranscript] = useState("")
  const pulseAnim = useRef(new Animated.Value(1)).current
  const waveAnim1 = useRef(new Animated.Value(0)).current
  const waveAnim2 = useRef(new Animated.Value(0)).current
  const waveAnim3 = useRef(new Animated.Value(0)).current
  const [saveCountdown, setSaveCountdown] = useState(AUTO_SAVE_COUNTDOWN)
  const [progress, setProgress] = useState(0)
  const [autoSaving, setAutoSaving] = useState(false)
  const animationRef = useRef(null)
  const [currentAction, setCurrentAction] = useState("")
  const speechTimeoutRef = useRef(null)
  const [showVoiceWaves, setShowVoiceWaves] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Dark mode theme colors
  const theme = {
    background: isDarkMode ? '#121212' : colors.background,
    surface: isDarkMode ? '#1E1E1E' : colors.surface,
    text: isDarkMode ? '#E1E1E1' : '#1e293b',
    secondaryText: isDarkMode ? '#ABABAB' : '#475569',
    cardBg: isDarkMode ? '#2A2A2A' : '#fff',
    cardHeader: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
    headerTitle: isDarkMode ? '#81ABFF' : '#1E40AF',
    inputBg: isDarkMode ? 'rgba(45, 45, 45, 0.8)' : 'rgba(226, 232, 240, 0.2)',
    inputBorder: isDarkMode ? 'rgba(80, 80, 80, 0.8)' : 'rgba(226, 232, 240, 0.8)',
    dateContainerBg: isDarkMode ? 'rgba(40, 50, 40, 0.84)' : 'rgba(243, 255, 239, 0.84)',
    dateBorder: isDarkMode ? 'rgba(60, 80, 60, 0.5)' : 'rgba(200, 220, 200, 0.5)',
    backButtonBg: isDarkMode ? 'rgba(60, 60, 60, 0.9)' : 'rgba(226, 232, 240, 0.9)',
    divider: isDarkMode ? 'rgba(80, 80, 80, 0.2)' : 'rgba(0, 0, 0, 0.05)',
    voiceHintBg: isDarkMode ? 'rgba(40, 50, 70, 0.6)' : 'rgba(236, 242, 250, 0.8)',
    voiceHintBorder: isDarkMode ? 'rgba(60, 80, 120, 0.5)' : 'rgba(200, 220, 240, 0.5)',
    autoSaveBg: isDarkMode ? 'rgba(40, 45, 55, 0.8)' : 'rgba(240, 245, 250, 0.8)',
    autoSaveBorder: isDarkMode ? 'rgba(60, 70, 90, 0.8)' : 'rgba(226, 232, 240, 0.8)',
  }

  // Voice animation - voice assistant style waves using transform scale instead of height
  useEffect(() => {
    if (recognizing) {
      // Set up staggered wave animations
      setShowVoiceWaves(true)

      // Wave 1 animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim1, {
            toValue: 0,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ).start()

      // Wave 2 animation with delay
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim2, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim2, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ).start()
      }, 200)

      // Wave 3 animation with delay
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim3, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim3, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ).start()
      }, 400)
    } else {
      // Reset animations when not recognizing
      waveAnim1.setValue(0)
      waveAnim2.setValue(0)
      waveAnim3.setValue(0)
      setShowVoiceWaves(false)
    }
  }, [recognizing])

  // Pulse animation effect
  useEffect(() => {
    let pulseAnimation
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
        ]),
      )
      pulseAnimation.start()
    } else {
      pulseAnim.setValue(1)
    }
    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop()
      }
    }
  }, [recognizing])

  // Enhanced deep link handling
  useEffect(() => {
    if (params.content) {
      console.log("Received task from deep link:", params.content)

      // Set the task title from deep link content
      setTaskData((prev) => ({
        ...prev,
        title: params.content,
        priority: params.priority || "", // Default to medium priority if not provided
      }))

      // Skip recording title and move to summary
      setTranscript(params.content)
      finishTask()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Auto-start if requested
      if (params.autoStart === "true") {
        setTimeout(() => {
          saveTaskAndNavigate()
        }, 1000)
      }
    } else {
      // No deep link content, start normal voice flow after a delay
      const timer = setTimeout(() => {
        if (currentStep === 0 && !recognizing && !transcript) {
          setCurrentAction("Starting voice input...")
          handleStart()
        }
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [])

  // Auto-process title after stopping recognition
  useEffect(() => {
    if (!recognizing && transcript && currentStep === 0 && !isEditing) {
      // Short delay to allow for UI updates before processing
      const timer = setTimeout(() => {
        processTitleInput()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [recognizing, transcript, currentStep])

  // Auto-save countdown effect
  useEffect(() => {
    if (autoSaving && saveCountdown > 0) {
      const timer = setTimeout(() => {
        setSaveCountdown((prev) => prev - 1)
      }, 1000)

      return () => clearTimeout(timer)
    } else if (autoSaving && saveCountdown === 0) {
      // Time's up, save and navigate
      saveTaskAndNavigate()
    }
  }, [autoSaving, saveCountdown])

  // Speech timeout handling
  useEffect(() => {
    if (recognizing) {
      // Clear any existing timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
      }
      // Set new timeout
      speechTimeoutRef.current = setTimeout(() => {
        if (recognizing && !transcript) {
          // No speech detected after timeout
          setCurrentAction("No speech detected, stopping...")
          handleStop()
        }
      }, SPEECH_TIMEOUT)
    }
    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
      }
    }
  }, [recognizing, transcript])

  // Speech recognition event handlers
  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setCurrentAction("Listening...")
  })

  useSpeechRecognitionEvent("end", () => {
    setRecognizing(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCurrentAction(transcript ? "Processing input..." : "No speech detected")

    // If editing title, update title and return to summary
    if (isEditing && transcript) {
      setTaskData((prev) => ({
        ...prev,
        title: transcript,
      }))
      setIsEditing(false)
      setCurrentStep(1)
    }
  })

  useSpeechRecognitionEvent("result", (event) => {
    const newTranscript = event.results[0]?.transcript || ""
    setTranscript(newTranscript)

    // Reset timeout if we get new speech
    if (newTranscript && speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
    }
  })

  const handleStart = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!result.granted) {
      console.warn("Permissions not granted", result)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setCurrentAction("Microphone permission denied")
      return
    }

    setCurrentAction("I'm listening...")
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
    })
  }

  const handleStop = () => {
    ExpoSpeechRecognitionModule.stop()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentAction("Processing...")
  }

  // Process the title input and move to summary
  const processTitleInput = () => {
    if (transcript) {
      setCurrentAction("Title captured, finalizing task")
      setTaskData((prev) => ({
        ...prev,
        title: transcript,
      }))
      finishTask()
    }
  }

  // Function to save task data and navigate to another screen
  const saveTaskAndNavigate = () => {
    try {
      const finalTaskData = {
        ...taskData,
        id: Date.now().toString(),
        created: new Date().toISOString(),
        status: "new",
      }

      const noteData = {
        id: finalTaskData.id,
        title: finalTaskData.title,
        content: "No description",
        date: new Date(finalTaskData.created).toISOString().split("T")[0],
        category: finalTaskData.priority === "high" ? "Important" : "Tasks",
        color:
          finalTaskData.priority === "high"
            ? "#DB2777"
            : finalTaskData.priority === "medium"
              ? "#4F46E5"
              : "#059669",
      }

      console.log("About to navigate with note data:", noteData)

      // First, store the note in AsyncStorage
      AsyncStorage.getItem("notes_data")
        .then((storedNotes) => {
          const currentNotes = storedNotes ? JSON.parse(storedNotes) : []
          const updatedNotes = [noteData, ...currentNotes]
          return AsyncStorage.setItem("notes_data", JSON.stringify(updatedNotes))
        })
        .then(() => {
          console.log("Note saved to storage, now navigating...")
          // Then navigate with params
          router.replace({
            pathname: "/(tabs)",
            params: {
              newNote: JSON.stringify(noteData),
              timestamp: Date.now(),
            },
          })
        })
        .catch((error) => {
          console.error("Error in save and navigate:", error)
        })

      setCurrentAction("Task saved successfully")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error("Error preparing task data:", error)
      setCurrentAction("Error saving task")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  // Finalize task creation with animation
  const finishTask = () => {
    setCurrentStep(1) // Move to summary
    setTranscript("")
    setCurrentAction("Task created successfully")
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Ensure animation plays
    setTimeout(() => {
      if (animationRef.current) {
        animationRef.current.play()
      }
    }, 100)

    // Update task data with final timestamp
    setTaskData((prev) => {
      return {
        ...prev,
        created: new Date().toISOString(),
      }
    })

    // Start auto-save countdown
    setSaveCountdown(AUTO_SAVE_COUNTDOWN)
    setAutoSaving(true)
  }

  // Get current step guidance
  const getStepLabel = () => {
    switch (currentStep) {
      case 0:
        return isEditing ? "Editing Task Title" : "Recording Task Title"
      default:
        return "Task Summary"
    }
  }

  const getStepInstructions = () => {
    switch (currentStep) {
      case 0:
        return isEditing ? "Speak a new title for your task" : "Speak a clear title for your task"
      default:
        return ""
    }
  }

  // Render voice wave animations using transform scale instead of height
  const renderVoiceWaves = () => {
    if (showVoiceWaves && recognizing) {
      // Define wave count and base properties
      const waveCount = 7;
      const waves = [];
      
      for (let i = 0; i < waveCount; i++) {
        // Calculate animation source - distribute waves to use different animations
        let animSource;
        if (i % 3 === 0) animSource = waveAnim1;
        else if (i % 3 === 1) animSource = waveAnim2;
        else animSource = waveAnim3;
        
        // Calculate magnitude based on position (center waves larger)
        const centerDistance = Math.abs(i - Math.floor(waveCount/2));
        const magnitude = 1 - (centerDistance * 0.15);
        
        waves.push(
          <Animated.View 
            key={`wave-${i}`}
            style={[
              styles.voiceWave,
              {
                transform: [{
                  scaleY: animSource.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1.5 * magnitude]
                  })
                }],
                backgroundColor: colors.primary,
                opacity: 0.6 + (magnitude * 0.4)
              }
            ]}
          />
        );
      }
      
      return (
        <View style={styles.voiceWavesContainer}>
          {waves}
        </View>
      );
    }
    return null;
  };

  // Render task summary with enhanced UI
  const renderTaskSummary = () => {
    if (currentStep === 1) {
      return (
        <View style={styles.taskSummary}>
          <Surface style={[styles.summaryCard, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.summaryHeader, { backgroundColor: theme.cardHeader }]}>
              <Text style={[styles.summaryHeaderText, { color: theme.headerTitle }]}>Task Ready</Text>
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
              <View style={[styles.dateContainer, { 
                backgroundColor: theme.dateContainerBg,
                borderColor: theme.dateBorder 
              }]}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={20}
                  color={theme.secondaryText}
                />
                <Text style={[styles.dateText, { color: theme.secondaryText }]}>
                  {new Date().toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>
            
            {autoSaving && (
              <View style={[
                styles.autoSaveIndicator, 
                { 
                  backgroundColor: theme.autoSaveBg,
                  borderTopColor: theme.autoSaveBorder 
                }
              ]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.autoSaveText, { color: theme.secondaryText }]}>
                  Saving automatically in {saveCountdown}...
                </Text>
              </View>
            )}
          </Surface>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Dark mode aware StatusBar */}
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <View style={[styles.headerContainer, { borderBottomColor: theme.divider }]}>
        <Pressable 
          style={[styles.backButton, { backgroundColor: theme.backButtonBg }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={27} color={theme.text} />
        </Pressable>

        <View style={styles.statusIndicator}>
          {recognizing && (
            <Animated.View
              style={[
                styles.recordingIndicator,
                {
                  backgroundColor: colors.error,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          )}
          <Text style={[styles.statusText, { color: recognizing ? colors.error : colors.primary }]}>
            {getStepLabel()}
          </Text>
        </View>
      </View>

      {/* Action indicator */}
      <View style={styles.actionIndicator}>
        <Text style={[styles.actionText, { color: colors.primary }]}>{currentAction}</Text>
      </View>

      <Surface style={[styles.transcriptSurface, { backgroundColor: theme.cardBg }]}>
        <ScrollView
          contentContainerStyle={styles.transcriptScrollview}
          showsVerticalScrollIndicator={false}
        >
          {/* Render voice waves above content when listening */}
          {renderVoiceWaves()}

          {currentStep === 1 ? (
            renderTaskSummary()
          ) : transcript ? (
            <View style={[styles.transcriptContainer, { 
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder 
            }]}>
              <MaterialCommunityIcons
                name="format-quote-open"
                size={24}
                color={colors.primary}
                style={styles.quoteIcon}
              />
              <Text style={[styles.transcript, { color: theme.text }]}>{transcript}</Text>
              <MaterialCommunityIcons
                name="format-quote-close"
                size={24}
                color={colors.primary}
                style={styles.quoteIcon}
              />
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons
                name="text-box-plus-outline"
                size={48}
                color={isDarkMode ? '#6B7280' : colors.disabled}
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
          )}

          {/* Step indicator dots */}
          <View style={styles.stepIndicator}>
            {[0, 1].map((step) => (
              <View
                key={step}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: currentStep >= step ? colors.primary : isDarkMode ? '#4B5563' : colors.disabled,
                    width: currentStep === step ? 12 : 8,
                    height: currentStep === step ? 12 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </ScrollView>
      </Surface>

      <View style={styles.controls}>
        {currentStep < 1 && (
          <>
            {recognizing && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.surface }]}
                onPress={handleStop}
              >
                <MaterialCommunityIcons name="cancel" size={24} color={colors.error} />
                <Text style={[styles.actionButtonText, { color: colors.error }]}>Cancel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.micButton,
                {
                  backgroundColor: recognizing ? colors.error : colors.primary,
                  shadowColor: recognizing ? colors.error : colors.primary,
                },
              ]}
              onPress={recognizing ? handleStop : handleStart}
              accessibilityLabel={recognizing ? "Stop recording" : "Start recording"}
              accessibilityHint="Double tap to toggle voice recording"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={recognizing ? "microphone-off" : "microphone"}
                size={30}
                color="white"
              />
              {recognizing && (
                <ActivityIndicator size="large" color="white" style={styles.recordingActivity} />
              )}
            </TouchableOpacity>

            {/* Voice command hints */}
            <View style={[styles.voiceHints, { 
              backgroundColor: theme.voiceHintBg,
              borderColor: theme.voiceHintBorder 
            }]}>
              <Text style={[styles.voiceHintText, { color: theme.secondaryText }]}>
                {isEditing
                  ? "Speak new title - auto-confirms when done"
                  : "Speak title - auto-confirms when done"}
              </Text>
            </View>
          </>
        )}

        {currentStep === 1 && (
          <View style={styles.finalButtons}>
            <TouchableOpacity
              style={[
                styles.finalButton,
                { 
                  backgroundColor: theme.surface, 
                  borderColor: colors.primary, 
                  borderWidth: 1 
                },
              ]}
              onPress={() => {
                // Edit title only
                setCurrentStep(0)
                setTranscript(taskData.title)
                setCurrentAction("Editing task title...")
                setAutoSaving(false)
                setIsEditing(true)
              }}
            >
              <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
              <Text style={[styles.finalButtonText, { color: colors.primary }]}>Edit Title</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.finalButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setAutoSaving(false)
                saveTaskAndNavigate()
              }}
            >
              <MaterialCommunityIcons name="check-circle" size={20} color="white" />
              <Text style={styles.finalButtonText}>Save Task</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // Core layout
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
  },
  
  // Header area
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 40,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  
  // Action status display
  actionIndicator: {
    backgroundColor: 'rgba(226, 232, 240, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Main content area
  transcriptSurface: {
    flex: 1,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 24,
    overflow: 'hidden',
  },
  transcriptScrollview: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  
  // Transcript display
  transcriptContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  transcript: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  quoteIcon: {
    alignSelf: 'center',
    marginVertical: 8,
    opacity: 0.5,
  },
  
  // Empty state
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 17,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
    maxWidth: '80%',
  },
  
  // Voice visualization
  voiceWavesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
    width: '100%',
    marginBottom: 20,
  },
  voiceWave: {
    width: 6,
    height: 40,
    borderRadius: 3,
    marginHorizontal: 5,
  },
  
  // Controls section
  controls: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    top: -84,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  recordingActivity: {
    position: 'absolute',
    width: 100,
    height: 100,
  },
  
  // Voice hints
  voiceHints: {
    marginTop: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(236, 242, 250, 0.8)',
    maxWidth: width * 0.85,
    borderWidth: 1,
    borderColor: 'rgba(200, 220, 240, 0.5)',
  },
  voiceHintText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    opacity: 0.75,
  },
  
  // Step indicators
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  stepDot: {
    borderRadius: 6,
    marginHorizontal: 5,
    opacity: 0.9,
  },
  
  // Task summary view (replacing Lottie animation)
  taskSummary: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  summaryCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.8)',
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  summaryHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#1E40AF',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  titleIcon: {
    marginRight: 14,
    marginTop: 2,
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '600',
    flex: 1,
    lineHeight: 28,
  },
  metaContainer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 24,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(243, 255, 239, 0.84)',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor:'light-grey',
    alignSelf: 'flex-start',
  },
  dateText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
  },
  priorityContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  priorityChip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  autoSaveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: 'rgba(240, 245, 250, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(226, 232, 240, 0.8)',
  },
  autoSaveText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
  },
  
  // Action buttons
  finalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 16,
  },
  finalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 16,
    minWidth: width * 0.4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  finalButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  // Auto-start prompt
  startPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startPromptText: {
    marginLeft: 10,
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  
  // Status completion visualization (replacing Lottie)
  completionIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 3,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  checkIcon: {
    fontSize: 40,
    color: '#22C55E',
  },
});

export default NewTask
