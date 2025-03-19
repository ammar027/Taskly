import React, { useState, useEffect, useRef } from "react"
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Pressable,
  Animated,
  BackHandler,
} from "react-native"
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition"
import { useSpeechRecognitionEvent } from "expo-speech-recognition"
import { Text, ActivityIndicator, useTheme as usePaperTheme, Surface } from "react-native-paper"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { StatusBar } from "expo-status-bar"
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTheme } from "@/components/ThemeContext"
import RNExitApp from "react-native-exit-app"
import { NavigationBarThemeHandler } from "@/components/NavigationBarThemeHandeler"
import { SafeAreaView } from "react-native-safe-area-context"
import NoteService from "@/services/NoteService"
import { useRealm } from "@/components/RealmContext"
import { useAuth } from "@/components/AuthContext"
import { Header } from "@/components/Record/Header"
import { VoiceWaves } from "@/components/Record/VoiceWaves"
import { EmptyState } from "@/components/Record/EmptyState"
import { TranscriptView } from "@/components/Record/TranscriptView"
import { TaskSummary } from "@/components/Record/TaskSummary"
import { VoiceControls } from "@/components/Record/VoiceControls"
import { FinalButtons } from "@/components/Record/FinalButtons"
import { StepIndicator } from "@/components/Record/StepIndicator"

// Constants
const { width } = Dimensions.get("window")
const SPEECH_TIMEOUT = 13000
const AUTO_SAVE_COUNTDOWN = 3
const AUTO_CONFIRM_TIMEOUT = 3000

const NewTask = () => {
  const { colors } = usePaperTheme()
  const { isDarkMode } = useTheme()
  const router = useRouter()
  // Get Realm instance and user ID for NoteService
  const realm = useRealm()
  const { user } = useAuth() 
  
  // Extract the user ID as a string from the user object
  const userId = user?.id || user?._id || user?.userId || (typeof user === 'string' ? user : 'anonymous')
  
  // Initialize NoteService with the string user ID
  const noteService = new NoteService(realm, userId)

  // Handle hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace({ pathname: "/(tabs)" })
        return true
      }
      BackHandler.addEventListener("hardwareBackPress", onBackPress)
      return () => BackHandler.removeEventListener("hardwareBackPress", onBackPress)
    }, [router]),
  )

  const params = useLocalSearchParams()

  // State declarations
  const [recognizing, setRecognizing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [taskData, setTaskData] = useState({
    title: "",
    priority: params.priority || "",
    created: null,
  })
  const [transcript, setTranscript] = useState("")
  const [saveCountdown, setSaveCountdown] = useState(AUTO_SAVE_COUNTDOWN)
  const [autoSaving, setAutoSaving] = useState(false)
  const [currentAction, setCurrentAction] = useState("")
  const [showVoiceWaves, setShowVoiceWaves] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [recordingStartTime, setRecordingStartTime] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [autoConfirmCountdown, setAutoConfirmCountdown] = useState(null)
  

  // Refs
  const pulseAnim = useRef(new Animated.Value(1)).current
  const waveAnim1 = useRef(new Animated.Value(0)).current
  const waveAnim2 = useRef(new Animated.Value(0)).current
  const waveAnim3 = useRef(new Animated.Value(0)).current
  const animationRef = useRef(null)
  const speechTimeoutRef = useRef(null)
  const [autoConfirmTimer, setAutoConfirmTimer] = useState(null)

  // Theme object derived from dark mode setting
  const theme = {
    background: isDarkMode ? "#121212" : colors.background,
    surface: isDarkMode ? "#1E1E1E" : colors.surface,
    text: isDarkMode ? "#E1E1E1" : "#1e293b",
    secondaryText: isDarkMode ? "#ABABAB" : "#475569",
    cardBg: isDarkMode ? "#2A2A2A" : "#fff",
    cardHeader: isDarkMode ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.08)",
    headerTitle: isDarkMode ? "#81ABFF" : "#1E40AF",
    inputBg: isDarkMode ? "rgba(45, 45, 45, 0.8)" : "rgba(226, 232, 240, 0.2)",
    inputBorder: isDarkMode ? "rgba(80, 80, 80, 0.8)" : "rgba(226, 232, 240, 0.8)",
    dateContainerBg: isDarkMode ? "rgba(40, 50, 40, 0.84)" : "rgba(243, 255, 239, 0.84)",
    dateBorder: isDarkMode ? "rgba(60, 80, 60, 0.5)" : "rgba(200, 220, 200, 0.5)",
    backButtonBg: isDarkMode ? "rgba(60, 60, 60, 0.9)" : "rgba(226, 232, 240, 0.9)",
    divider: isDarkMode ? "rgba(80, 80, 80, 0.2)" : "rgba(0, 0, 0, 0.05)",
    voiceHintBg: isDarkMode ? "rgba(63, 63, 64, 0.6)" : "rgba(236, 242, 250, 0.8)",
    voiceHintBorder: isDarkMode ? "rgba(116, 116, 117, 0.5)" : "rgba(200, 220, 240, 0.5)",
    autoSaveBg: isDarkMode ? "rgba(40, 45, 55, 0.8)" : "rgba(240, 245, 250, 0.8)",
    autoSaveBorder: isDarkMode ? "rgba(89, 89, 89, 0.8)" : "rgba(226, 232, 240, 0.8)",
  }

  // Handle voice animations
  useEffect(() => {
    if (recognizing) {
      setShowVoiceWaves(true)

      // Wave animations with staggered starts
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim1, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(waveAnim1, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      ).start()

      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim2, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(waveAnim2, { toValue: 0, duration: 800, useNativeDriver: true }),
          ]),
        ).start()
      }, 200)

      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(waveAnim3, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(waveAnim3, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ).start()
      }, 400)
    } else {
      waveAnim1.setValue(0)
      waveAnim2.setValue(0)
      waveAnim3.setValue(0)
      setShowVoiceWaves(false)
    }
  }, [recognizing])

  // Handle pulse animation
  useEffect(() => {
    let pulseAnimation
    if (recognizing) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      )
      pulseAnimation.start()
    } else {
      pulseAnim.setValue(1)
    }
    return () => {
      if (pulseAnimation) pulseAnimation.stop()
    }
  }, [recognizing])

  // Deep link handling
  useEffect(() => {
    if (params.content) {
      setTaskData((prev) => {
        return {
          ...prev,
          title: params.content,
          priority: params.priority || "",
        }
      })
      setTranscript(params.content)
      finishTask()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      if (params.autoStart === "true") {
        setTimeout(() => saveTaskAndNavigate(), 1000)
      }
    } else {
      const timer = setTimeout(() => {
        if (currentStep === 0 && !recognizing && !transcript) {
          setCurrentAction("Starting voice input...")
          handleStart()
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Auto-process title after recognition stops
  useEffect(() => {
    if (!recognizing && transcript && currentStep === 0 && !isEditing) {
      const timer = setTimeout(() => processTitleInput(), 1500)
      return () => clearTimeout(timer)
    }
  }, [recognizing, transcript, currentStep])

  // Recording duration timer
  useEffect(() => {
    let interval
    if (recognizing) {
      interval = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - (recordingStartTime || Date.now())) / 1000))
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(interval)
  }, [recognizing, recordingStartTime])

  // Auto-save countdown
  useEffect(() => {
    if (autoSaving && saveCountdown > 0) {
      const timer = setTimeout(() => setSaveCountdown((prev) => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (autoSaving && saveCountdown === 0) {
      saveTaskAndNavigate()
    }
  }, [autoSaving, saveCountdown])

  // Speech timeout handling
  useEffect(() => {
    if (recognizing) {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current)

      speechTimeoutRef.current = setTimeout(() => {
        if (recognizing && !transcript) {
          setCurrentAction("No speech detected, stopping...")
          handleStop()
        }
      }, SPEECH_TIMEOUT)
    }
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current)
    }
  }, [recognizing, transcript])

  // Auto-confirm handling
  useEffect(() => {
    if (recognizing && currentStep === 0) {
      if (autoConfirmTimer) clearTimeout(autoConfirmTimer)

      const timer = setTimeout(() => {
        if (recognizing && transcript) {
          handleStop()
          setTimeout(() => processTitleInput(), 500)
        }
      }, AUTO_CONFIRM_TIMEOUT)
      setAutoConfirmTimer(timer)
    }
    return () => {
      if (autoConfirmTimer) clearTimeout(autoConfirmTimer)
    }
  }, [recognizing, currentStep])

  // Auto-confirm countdown display
  useEffect(() => {
    let interval
    if (recognizing && transcript && currentStep === 0) {
      const startTime = Date.now()
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.ceil((AUTO_CONFIRM_TIMEOUT - elapsed) / 1000)
        setAutoConfirmCountdown(remaining <= 1 ? remaining : null)
        if (elapsed >= AUTO_CONFIRM_TIMEOUT) clearInterval(interval)
      }, 1000)
    } else {
      setAutoConfirmCountdown(null)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [recognizing, transcript, currentStep])

  // Speech recognition event handlers
  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true)
    setRecordingStartTime(Date.now())
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
    setCurrentAction("Listening...")
  })

  useSpeechRecognitionEvent("end", () => {
    setRecognizing(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCurrentAction(transcript ? "Processing input..." : "No speech detected")
    if (isEditing && transcript) {
      setTaskData((prev) => ({ ...prev, title: transcript }))
      setIsEditing(false)
      setCurrentStep(1)
    }
  })

  useSpeechRecognitionEvent("result", (event) => {
    const newTranscript = event.results[0]?.transcript || ""
    setTranscript(newTranscript)

    if (newTranscript) {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current)
        speechTimeoutRef.current = setTimeout(() => {
          if (recognizing) handleStop()
        }, SPEECH_TIMEOUT)
      }

      if (autoConfirmTimer) {
        clearTimeout(autoConfirmTimer)
        setAutoConfirmTimer(
          setTimeout(() => {
            if (recognizing && transcript) {
              handleStop()
              setTimeout(() => processTitleInput(), 1000)
            }
          }, AUTO_CONFIRM_TIMEOUT),
        )
      }
    }
  })

  // Start speech recognition
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
      continuous: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
    })
  }

  // Stop speech recognition
  const handleStop = () => {
    ExpoSpeechRecognitionModule.stop()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentAction("Processing...")
    if (autoConfirmTimer) {
      clearTimeout(autoConfirmTimer)
      setAutoConfirmTimer(null)
    }
  }

  // Process the title input
  const processTitleInput = () => {
    if (transcript) {
      setCurrentAction("Title captured, finalizing task")
      setTaskData((prev) => ({ ...prev, title: transcript }))
      finishTask()
    }
  }

  // Save task and navigate
  const saveTaskAndNavigate = () => {
    try {
      // Create the task data
      const now = new Date()
      
      // Define the priority color mapping
      const priorityColorMap = {
        high: "#DB2777",
        medium: "#4F46E5",
        low: "#059669"
      }
      
      // Define the category based on priority
      const category = taskData.priority === "high" ? "Important" : "Tasks"
      
      // Define the color based on priority
      const color = priorityColorMap[taskData.priority || "low"]
      
      // Create the note in Realm using the NoteService
      const noteId = noteService.createNote(
        taskData.title,  // title
        "",              // content (empty initially)
        category,        // category
        color,           // color
        false            // isCompleted
      )
      
      // Create a simple object to pass via navigation params
      const noteData = {
        id: noteId,
        title: taskData.title,
        content: "",
        category: category,
        color: color,
        date: now.toISOString().split("T")[0]
      }
  
      // Handle navigation based on the params
      if (params.returnToTabs === "true") {
        router.replace({
          pathname: "/(tabs)",
          params: { newNote: JSON.stringify(noteData), timestamp: Date.now() },
        })
      } else {
        setTimeout(() => RNExitApp.exitApp(), 1000)
      }
  
      setCurrentAction("Task saved successfully")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error("Error preparing task data:", error)
      setCurrentAction("Error saving task")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  // Finalize task creation
  const finishTask = () => {
    setCurrentStep(1)
    setTranscript("")
    setCurrentAction("Task created successfully")
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    if (animationRef.current) setTimeout(() => animationRef.current.play(), 100)

    setTaskData((prev) => ({ ...prev, created: new Date().toISOString() }))
    setSaveCountdown(AUTO_SAVE_COUNTDOWN)
    setAutoSaving(true)
  }

  // Helper functions
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <Header
        router={router}
        params={params}
        isDarkMode={isDarkMode}
        theme={theme}
        recognizing={recognizing}
        recordingTime={recordingTime}
        getStepLabel={getStepLabel}
        colors={colors}
      />

      <View style={styles.actionIndicator}>
        <Text style={[styles.actionText, { color: colors.primary }]}>{currentAction}</Text>
      </View>

      <Surface style={[styles.transcriptSurface, { backgroundColor: theme.cardBg }]}>
        <ScrollView
          contentContainerStyle={styles.transcriptScrollview}
          showsVerticalScrollIndicator={false}
        >
          <VoiceWaves
            showVoiceWaves={showVoiceWaves}
            recognizing={recognizing}
            waveAnim1={waveAnim1}
            waveAnim2={waveAnim2}
            waveAnim3={waveAnim3}
            colors={colors}
          />

          {currentStep === 1 ? (
            <TaskSummary
              theme={theme}
              colors={colors}
              taskData={taskData}
              autoSaving={autoSaving}
              saveCountdown={saveCountdown}
            />
          ) : transcript ? (
            <TranscriptView transcript={transcript} theme={theme} colors={colors} />
          ) : (
            <EmptyState
              isDarkMode={isDarkMode}
              colors={colors}
              theme={theme}
              getStepInstructions={getStepInstructions}
              handleStart={handleStart}
              recognizing={recognizing}
              currentStep={currentStep}
              isEditing={isEditing}
            />
          )}

          <StepIndicator currentStep={currentStep} colors={colors} isDarkMode={isDarkMode} />
        </ScrollView>
      </Surface>

      <View style={styles.controls}>
        {currentStep < 1 ? (
          <VoiceControls
            theme={theme}
            isEditing={isEditing}
            recognizing={recognizing}
            autoConfirmCountdown={autoConfirmCountdown}
            recordingTime={recordingTime}
            handleStop={handleStop}
            handleStart={handleStart}
            colors={colors}
          />
        ) : (
          <FinalButtons
            theme={theme}
            colors={colors}
            setCurrentStep={setCurrentStep}
            taskData={taskData}
            setTranscript={setTranscript}
            setCurrentAction={setCurrentAction}
            setAutoSaving={setAutoSaving}
            setIsEditing={setIsEditing}
            saveTaskAndNavigate={saveTaskAndNavigate}
          />
        )}
      </View>

      <NavigationBarThemeHandler
        specialState={recognizing}
        specialColor={recognizing ? (isDarkMode ? "rgb(29, 21, 21)" : "rgb(245, 228, 228)") : null}
        specialButtonStyle={isDarkMode ? "light" : "dark"}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 20 : 20 },
  actionIndicator: {
    backgroundColor: "rgba(226, 232, 240, 0.5)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 20,
  },
  actionText: { fontSize: 14, fontWeight: "500" },
  transcriptSurface: {
    flex: 1,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 24,
    overflow: "hidden",
  },
  transcriptScrollview: { flexGrow: 1, justifyContent: "center", padding: 20 },
  controls: { paddingBottom: 40, alignItems: "center", justifyContent: "center" },
})

export default NewTask
