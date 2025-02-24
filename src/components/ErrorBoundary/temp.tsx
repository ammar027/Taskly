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
import { Audio } from 'expo-audio'
import * as FileSystem from 'expo-file-system'
import { Text, ActivityIndicator, useTheme as usePaperTheme, Surface } from "react-native-paper"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import * as Haptics from "expo-haptics"
import { StatusBar } from "expo-status-bar"
import { useLocalSearchParams, useRouter } from "expo-router"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useTheme } from "@/components/ThemeContext"

const { width } = Dimensions.get("window")
const WHISPER_API_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions'
const MAX_RECORDING_DURATION = 300000 // 5 minutes in milliseconds

const NewTask = () => {
  // ... keep existing state variables ...
  const [recording, setRecording] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const recordingTimer = useRef(null)

  // Initialize audio recording
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync()
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )
      
      setRecording(recording)
      setRecognizing(true)
      setCurrentAction("Recording...")
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

      // Set timer to auto-stop after MAX_RECORDING_DURATION
      recordingTimer.current = setTimeout(() => {
        stopRecording()
      }, MAX_RECORDING_DURATION)

    } catch (err) {
      console.error('Failed to start recording', err)
      setCurrentAction("Failed to start recording")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  // Stop recording and process with Whisper
  const stopRecording = async () => {
    if (!recording) return

    clearTimeout(recordingTimer.current)
    setRecognizing(false)
    setIsProcessing(true)
    setCurrentAction("Processing audio...")

    try {
      await recording.stopAndUnloadAsync()
      const uri = recording.getURI()
      setRecording(null)

      // Process with Whisper API
      const transcription = await processAudioWithWhisper(uri)
      
      if (transcription) {
        setTranscript(transcription)
        if (currentStep === 0 && !isEditing) {
          processTitleInput()
        }
      }

    } catch (err) {
      console.error('Failed to stop recording', err)
      setCurrentAction("Failed to process recording")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }

    setIsProcessing(false)
  }

  // Process audio file with Whisper API
  const processAudioWithWhisper = async (audioUri) => {
    try {
      // Create form data with audio file
      const formData = new FormData()
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a'
      })
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')

      const response = await fetch(WHISPER_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${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}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      })

      const data = await response.json()
      return data.text

    } catch (err) {
      console.error('Whisper API error:', err)
      return null
    }
  }

  // Replace existing speech recognition handlers
  const handleStart = () => {
    startRecording()
  }

  const handleStop = () => {
    stopRecording()
  }

  // Update the existing render methods to handle processing state
  const renderControls = () => {
    return (
      <View style={styles.controls}>
        {currentStep < 1 && (
          <>
            {(recognizing || isProcessing) && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.surface }]}
                onPress={handleStop}
                disabled={isProcessing}
              >
                <MaterialCommunityIcons name="cancel" size={24} color={colors.error} />
                <Text style={[styles.actionButtonText, { color: colors.error }]}>
                  {isProcessing ? 'Processing...' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.micButton,
                {
                  backgroundColor: recognizing ? colors.error : colors.primary,
                  shadowColor: recognizing ? colors.error : colors.primary,
                  opacity: isProcessing ? 0.7 : 1
                },
              ]}
              onPress={recognizing ? handleStop : handleStart}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="large" color="white" />
              ) : (
                <MaterialCommunityIcons
                  name={recognizing ? "microphone-off" : "microphone"}
                  size={30}
                  color="white"
                />
              )}
            </TouchableOpacity>

            <View style={[styles.voiceHints, { 
              backgroundColor: theme.voiceHintBg,
              borderColor: theme.voiceHintBorder 
            }]}>
              <Text style={[styles.voiceHintText, { color: theme.secondaryText }]}>
                {isProcessing ? "Processing your recording..."
                  : isEditing ? "Record new title - processes when done"
                  : "Record title - processes when done"}
              </Text>
            </View>
          </>
        )}

        {/* ... rest of the controls ... */}
      </View>
    )
  }

  // ... rest of the component code remains the same ...
}

// ... styles remain the same ...

export default NewTask