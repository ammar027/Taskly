import React, {useState, useEffect, useRef} from 'react'
import {View, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Platform, Pressable, Animated, BackHandler, Alert} from 'react-native'
import {ExpoSpeechRecognitionModule} from 'expo-speech-recognition'
import {useSpeechRecognitionEvent} from 'expo-speech-recognition'
import {Text, ActivityIndicator, useTheme as usePaperTheme, Surface} from 'react-native-paper'
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import {StatusBar} from 'expo-status-bar'
import {useFocusEffect, useLocalSearchParams, useRouter} from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useTheme} from '@/components/ThemeContext'
import RNExitApp from 'react-native-exit-app'
import {NavigationBarThemeHandler} from '@/components/NavigationBarThemeHandeler'
import {SafeAreaView} from 'react-native-safe-area-context'
import NoteService from '@/services/NoteService'
import {useRealm} from '@/components/RealmContext'
import {useAuth} from '@/components/AuthContext'
import {Header} from '@/components/Record/Header'
import {VoiceWaves} from '@/components/Record/VoiceWaves'
import {EmptyState} from '@/components/Record/EmptyState'
import {TranscriptView} from '@/components/Record/TranscriptView'
import {TaskSummary} from '@/components/Record/TaskSummary'
import {VoiceControls} from '@/components/Record/VoiceControls'
import {FinalButtons} from '@/components/Record/FinalButtons'
import {StepIndicator} from '@/components/Record/StepIndicator'

// Constants
const {width} = Dimensions.get('window')
const SPEECH_TIMEOUT = 13000
const AUTO_SAVE_COUNTDOWN = 2
const AUTO_CONFIRM_TIMEOUT = 2000

const NewTask = () => {
  const {colors} = usePaperTheme()
  const {isDarkMode} = useTheme()
  const router = useRouter()
  // Get Realm instance and user ID for NoteService
  const realm = useRealm()
  const {user} = useAuth()

  // Extract the user ID as a string from the user object
  const userId = user?.id || user?._id || user?.userId || (typeof user === 'string' ? user : 'anonymous')

  // Initialize NoteService with the string user ID
  const noteService = new NoteService(realm, userId)

  // Handle hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace({pathname: '/(tabs)'})
        return true
      }
      BackHandler.addEventListener('hardwareBackPress', onBackPress)
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress)
    }, [router])
  )

  const params = useLocalSearchParams()

  // State declarations
  const [recognizing, setRecognizing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [taskData, setTaskData] = useState({
    title: '',
    content: '', // This will be our description
    dueDate: '',
    category: '',
    priority: params.priority || '',
    created: null
  })
  const [transcript, setTranscript] = useState('')
  const [saveCountdown, setSaveCountdown] = useState(AUTO_SAVE_COUNTDOWN)
  const [autoSaving, setAutoSaving] = useState(false)
  const [currentAction, setCurrentAction] = useState('')
  const [showVoiceWaves, setShowVoiceWaves] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [recordingStartTime, setRecordingStartTime] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [autoConfirmCountdown, setAutoConfirmCountdown] = useState(null)
  const [currentField, setCurrentField] = useState('title') // Default to title
  const [captureMode, setCaptureMode] = useState(true) // Start in capture mode for title
  const [fieldContent, setFieldContent] = useState({})

  // Refs
  const pulseAnim = useRef(new Animated.Value(1)).current
  const waveAnim1 = useRef(new Animated.Value(0)).current
  const waveAnim2 = useRef(new Animated.Value(0)).current
  const waveAnim3 = useRef(new Animated.Value(0)).current
  const animationRef = useRef(null)
  const speechTimeoutRef = useRef(null)
  const [autoConfirmTimer, setAutoConfirmTimer] = useState(null)

  const keywords = {
    TITLE: ['title', 'task title', 'the title', 'title is', 'name', 'task name', 'create task', 'create a task'],
    DESCRIPTION: ['description', 'details', 'content', 'describe', 'task details', 'the description'],
    DUE_DATE: ['due date', 'deadline', 'due', 'due by', 'when is it due', 'complete by', 'finish by', 'date'],
    CATEGORY: ['category', 'type', 'tag', 'label', 'group', 'the category', 'category is'],
    PRIORITY: ['priority', 'importance', 'urgent', 'high priority', 'low priority', 'medium priority']
  }

  // Valid categories
  const validCategories = ['Tasks', 'Work', 'Projects', 'Personal', 'Meetings', 'Ideas', 'Notes']

  // Valid priorities
  const validPriorities = ['high', 'medium', 'low']

  // Theme object derived from dark mode setting
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
    voiceHintBg: isDarkMode ? 'rgba(63, 63, 64, 0.6)' : 'rgba(236, 242, 250, 0.8)',
    voiceHintBorder: isDarkMode ? 'rgba(116, 116, 117, 0.5)' : 'rgba(200, 220, 240, 0.5)',
    autoSaveBg: isDarkMode ? 'rgba(40, 45, 55, 0.8)' : 'rgba(240, 245, 250, 0.8)',
    autoSaveBorder: isDarkMode ? 'rgba(89, 89, 89, 0.8)' : 'rgba(226, 232, 240, 0.8)'
  }

  // Handle voice animations
  useEffect(() => {
    if (recognizing) {
      setShowVoiceWaves(true)

      // Wave animations with staggered starts
      Animated.loop(Animated.sequence([Animated.timing(waveAnim1, {toValue: 1, duration: 700, useNativeDriver: true}), Animated.timing(waveAnim1, {toValue: 0, duration: 700, useNativeDriver: true})])).start()

      setTimeout(() => {
        Animated.loop(Animated.sequence([Animated.timing(waveAnim2, {toValue: 1, duration: 800, useNativeDriver: true}), Animated.timing(waveAnim2, {toValue: 0, duration: 800, useNativeDriver: true})])).start()
      }, 200)

      setTimeout(() => {
        Animated.loop(Animated.sequence([Animated.timing(waveAnim3, {toValue: 1, duration: 600, useNativeDriver: true}), Animated.timing(waveAnim3, {toValue: 0, duration: 600, useNativeDriver: true})])).start()
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
      pulseAnimation = Animated.loop(Animated.sequence([Animated.timing(pulseAnim, {toValue: 1.3, duration: 800, useNativeDriver: true}), Animated.timing(pulseAnim, {toValue: 1, duration: 800, useNativeDriver: true})]))
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
      setTaskData(prev => {
        return {
          ...prev,
          title: params.content,
          priority: params.priority || ''
        }
      })
      setTranscript(params.content)
      finishTask()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      if (params.autoStart === 'true') {
        setTimeout(() => saveTaskAndNavigate(), 1000)
      }
    } else {
      const timer = setTimeout(() => {
        if (currentStep === 0 && !recognizing && !transcript) {
          setCurrentAction('Starting voice input...')
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
      const timer = setTimeout(() => setSaveCountdown(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (autoSaving && saveCountdown === 0) {
      // Validate before saving
      const validationIssues = validateTask()
      if (validationIssues.length > 0) {
        setAutoSaving(false)
        setCurrentAction(`Please fix: ${validationIssues.join(', ')}`)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      } else {
        saveTaskAndNavigate()
      }
    }
  }, [autoSaving, saveCountdown])

  // Speech timeout handling
  useEffect(() => {
    if (recognizing) {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current)

      speechTimeoutRef.current = setTimeout(() => {
        if (recognizing && !transcript) {
          setCurrentAction('No speech detected, stopping...')
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
  useSpeechRecognitionEvent('start', () => {
    setRecognizing(true)
    setRecordingStartTime(Date.now())
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
    setCurrentAction('Listening... Say title, description, due date, or category')
  })

  useSpeechRecognitionEvent('end', () => {
    setRecognizing(false)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setCurrentAction('Processing your input...')

    // If we're in the first step and have a title, move to next step
    if (currentStep === 0 && taskData.title) {
      // Wait a bit before moving to next step to give user time to read
      setTimeout(() => {
        setCurrentStep(1)
        setCurrentAction('Task created! You can now add more details.')
      }, 1500)
    }
  })

  useSpeechRecognitionEvent('result', event => {
    const newTranscript = event.results[0]?.transcript || ''
    setTranscript(newTranscript)

    // Process the transcript
    if (newTranscript.trim()) {
      processSpeechInput(newTranscript, event.isFinal)
    }

    // Reset speech timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = setTimeout(() => {
        if (recognizing) handleStop()
      }, SPEECH_TIMEOUT)
    }
  })

  // Helper functions for speech processing
  const processSpeechInput = (text, isFinal) => {
    const lowerText = text.toLowerCase()

    // First, check for command keywords
    const commandKeywords = ['done', 'save task', 'finish task', "that's it", 'complete task']
    if (isFinal && commandKeywords.some(keyword => lowerText.includes(keyword))) {
      handleStop()
      setTimeout(() => finishTask(), 500)
      return
    }

    // Then check for field keywords
    let fieldDetected = false
    for (const [field, fieldKeywords] of Object.entries(keywords)) {
      if (containsAny(lowerText, fieldKeywords)) {
        const fieldName = field.toLowerCase()
        const content = extractContentAfterKeyword(text, lowerText, fieldKeywords)

        // Skip if it looks like a command
        if (content && commandKeywords.some(cmd => content.toLowerCase().includes(cmd))) {
          continue
        }

        setCurrentField(fieldName)
        setCurrentAction(`Processing ${fieldName.replace('_', ' ')}...`)

        if (content && content.trim().length > 0) {
          updateTaskField(fieldName, content)
          setCurrentAction(`${fieldName.replace('_', ' ')} captured: "${content}"`)
        }
        fieldDetected = true
        break
      }
    }

    // If no keyword found, assume content is for current field
    if (!fieldDetected && text.trim()) {
      // Also check if this is a command before updating the current field
      if (!commandKeywords.some(cmd => lowerText.includes(cmd))) {
        updateTaskField(currentField, text)
        setCurrentAction(`${currentField.replace('_', ' ')} updated: "${text}"`)
      }
    }
  }

  // Helper function to update task data based on field
  const updateTaskField = (field, content) => {
    switch (field) {
      case 'title':
        setTaskData(prev => ({...prev, title: content}))
        break
      case 'description':
        setTaskData(prev => ({...prev, content: content}))
        break
      case 'due_date':
        // Process date strings like "March 12" or "tomorrow"
        const processedDate = processDateString(content)
        setTaskData(prev => ({...prev, dueDate: processedDate}))
        break
      case 'category':
        // Match against valid categories
        const matchedCategory = findClosestCategory(content, validCategories)
        setTaskData(prev => ({...prev, category: matchedCategory || 'Tasks'}))
        break
      case 'priority':
        // Match against valid priorities
        const matchedPriority = findClosestPriority(content, validPriorities)
        setTaskData(prev => ({...prev, priority: matchedPriority || 'medium'}))
        break
    }
  }

  // Helper function to process date strings
  const processDateString = dateText => {
    const lowerDateText = dateText.toLowerCase().trim()
    const today = new Date()

    // Handle relative dates
    if (lowerDateText.includes('today')) {
      return today.toISOString().split('T')[0]
    }

    if (lowerDateText.includes('tomorrow')) {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      return tomorrow.toISOString().split('T')[0]
    }

    if (lowerDateText.match(/\d+\s*days?\s*from\s*(today|now)/)) {
      const daysMatch = lowerDateText.match(/(\d+)\s*days?\s*from/)
      if (daysMatch && daysMatch[1]) {
        const days = parseInt(daysMatch[1])
        const futureDate = new Date(today)
        futureDate.setDate(futureDate.getDate() + days)
        return futureDate.toISOString().split('T')[0]
      }
    }

    if (lowerDateText.match(/next\s*(week|month|year)/)) {
      const unit = lowerDateText.match(/next\s*(week|month|year)/)[1]
      const futureDate = new Date(today)

      if (unit === 'week') {
        futureDate.setDate(futureDate.getDate() + 7)
      } else if (unit === 'month') {
        futureDate.setMonth(futureDate.getMonth() + 1)
      } else if (unit === 'year') {
        futureDate.setFullYear(futureDate.getFullYear() + 1)
      }

      return futureDate.toISOString().split('T')[0]
    }

    // Handle month and date combinations
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

    // Check for patterns like "March 15" or "15th of March"
    for (let i = 0; i < monthNames.length; i++) {
      const monthName = monthNames[i]

      // Pattern: "March 15" or "March 15th"
      const pattern1 = new RegExp(`${monthName}\\s+(\\d+)(st|nd|rd|th)?`, 'i')
      // Pattern: "15th of March"
      const pattern2 = new RegExp(`(\\d+)(st|nd|rd|th)?\\s+of\\s+${monthName}`, 'i')

      let match = lowerDateText.match(pattern1) || lowerDateText.match(pattern2)
      if (match) {
        const day = parseInt(match[1])
        const month = i // 0-based month index
        const year = today.getFullYear()

        // If the date is in the past, assume next year
        const dateObj = new Date(year, month, day)
        if (dateObj < today) {
          dateObj.setFullYear(year + 1)
        }

        return dateObj.toISOString().split('T')[0]
      }
    }

    // Try to parse explicit date formats
    try {
      // Try to parse via Date constructor
      const parsedDate = new Date(dateText)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0]
      }
    } catch (e) {
      console.log('Error parsing date:', e)
    }

    // Return the original text if parsing fails
    return dateText
  }

  // Helper function to find the closest matching category
  const findClosestCategory = (input, categories) => {
    const lowerInput = input.toLowerCase().trim()

    // Direct match
    for (const category of categories) {
      if (lowerInput.includes(category.toLowerCase())) {
        return category
      }
    }

    // Return the first category as default
    return categories[0]
  }

  // Helper function to find the closest matching priority
  const findClosestPriority = (input, priorities) => {
    const lowerInput = input.toLowerCase().trim()

    // Direct match
    for (const priority of priorities) {
      if (lowerInput.includes(priority)) {
        return priority
      }
    }

    // Handle common expressions
    if (lowerInput.includes('urgent') || lowerInput.includes('important')) {
      return 'high'
    }
    if (lowerInput.includes('not urgent') || lowerInput.includes('can wait')) {
      return 'low'
    }

    // Default to medium
    return 'medium'
  }

  // Helper function to check if text contains any of the keywords
  const containsAny = (text, keywords) => {
    return keywords.some(keyword => {
      // Use word boundaries for more accurate matching
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i')
      return regex.test(text)
    })
  }

  // Helper function to extract content after a keyword
  const extractContentAfterKeyword = (text, lowerText, keywords) => {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        const keywordIndex = lowerText.indexOf(keyword.toLowerCase())
        const content = text.substring(keywordIndex + keyword.length).trim()

        // Filter out common filler words
        if (content && !['is', 'the', 'a', 'an', 'this', 'that'].includes(content.toLowerCase())) {
          return content
        }
      }
    }
    return null
  }

  const detectField = text => {
    const lowerText = text.toLowerCase()

    // Check for field keywords
    for (const [field, fieldKeywords] of Object.entries(keywords)) {
      // Check if any of the field keywords appear at the start of the text
      for (const keyword of fieldKeywords) {
        if (lowerText.startsWith(keyword)) {
          return field.toLowerCase()
        }

        // Check for phrases like "the title is" or "set the priority to"
        const setterPhrases = [`the ${keyword} is`, `set the ${keyword} to`, `set ${keyword} to`, `make the ${keyword}`, `${keyword} should be`]

        if (setterPhrases.some(phrase => lowerText.includes(phrase))) {
          return field.toLowerCase()
        }
      }
    }

    return null // No field detected
  }

  const processVoiceCommand = command => {
    if (handleVoiceCommand(command)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Display a brief toast message
      Toast.show({
        type: 'success',
        text1: 'Command recognized',
        text2: command,
        visibilityTime: 2000,
        position: 'bottom'
      })

      return true
    }
    return false
  }

  const handleVoiceCommand = command => {
    const lowerCommand = command.toLowerCase()

    if (lowerCommand.includes('cancel') || lowerCommand.includes('stop')) {
      handleStop()
      setCurrentAction('Voice input cancelled')
      return true
    }

    if (lowerCommand.includes('done') || lowerCommand.includes('save task') || lowerCommand.includes('finish task') || lowerCommand.includes("that's it")) {
      handleStop()
      setTimeout(() => finishTask(), 500)
      return true
    }

    if (lowerCommand.includes('start over') || lowerCommand.includes('reset')) {
      handleStop()
      setTranscript('')
      setTaskData({
        title: '',
        content: '',
        dueDate: '',
        category: '',
        priority: params.priority || '',
        created: null
      })
      setCurrentStep(0)
      setCurrentAction('Starting over...')
      return true
    }

    return false // Not a recognized command
  }

  // Modified start speech recognition function
  const handleStart = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!result.granted) {
      console.warn('Permissions not granted', result)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      setCurrentAction('Microphone permission denied')
      return
    }

    setCurrentAction("I'm listening... Say title, description, due date, or category")
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
      contextualStrings: [
        "done", "save task", "finish task", "that's it", "cancel", "stop", "start over", "reset",
        "title", "description", "due date", "category", "priority",
        "task", "project", "deadline", "work", "personal", "high", "medium", "low",
        "notes", "meetings", "create task", "todo", "to-do",
        "today", "tomorrow", "next week", "days from now", "next month",
        "January", "February", "March", "April", "May", "June", "July", "August", 
        "September", "October", "November", "December"
      ]
    })
  }

  // Stop speech recognition
  const handleStop = () => {
    ExpoSpeechRecognitionModule.stop()
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentAction('Processing...')
    if (autoConfirmTimer) {
      clearTimeout(autoConfirmTimer)
      setAutoConfirmTimer(null)
    }
  }

  // Process the title input
  const processTitleInput = () => {
    if (transcript) {
      setCurrentAction('Title captured, finalizing task')
      setTaskData(prev => ({...prev, title: transcript}))
      finishTask()
    }
  }

  const validateTask = () => {
    const issues = []

    if (!taskData.title || taskData.title.trim() === '') {
      issues.push('Title is required')
    }

    if (taskData.dueDate && !isValidDate(taskData.dueDate)) {
      issues.push('Due date is not valid')
    }

    if (taskData.priority && !validPriorities.includes(taskData.priority.toLowerCase())) {
      issues.push('Priority must be high, medium, or low')
    }

    return issues
  }
  const isValidDate = dateString => {
    // If it's already in ISO format (YYYY-MM-DD), it's valid
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return true
    }

    // Try to parse the date
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }

  // Save task and navigate
  const saveTaskAndNavigate = () => {
    try {
      // Create the task data
      const now = new Date()

      // Normalize the priority value
      let normalizedPriority = (taskData.priority || 'medium').toLowerCase()
      if (!validPriorities.includes(normalizedPriority)) {
        normalizedPriority = 'medium' // Default to medium if invalid
      }

      // Format the due date properly
      let formattedDueDate = null
      if (taskData.dueDate) {
        // Ensure it's in YYYY-MM-DD format
        if (typeof taskData.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(taskData.dueDate)) {
          formattedDueDate = taskData.dueDate
        } else {
          // Try to convert to ISO format
          try {
            const date = new Date(taskData.dueDate)
            if (!isNaN(date.getTime())) {
              formattedDueDate = date.toISOString().split('T')[0]
            }
          } catch (e) {
            console.error('Error formatting date:', e)
          }
        }
      }

      // Define the category color mapping
      const categoryColorMap = {
        Tasks: '#059669',
        Work: '#4F46E5',
        Ideas: '#DB2777',
        Personal: '#D97706',
        Projects: '#7C3AED',
        Meetings: '#BE123C',
        Notes: '#4F46E5'
      }

      // Use the captured category or default to "Tasks"
      const category = (taskData.category || 'Tasks').trim()

      // Define the color based on category
      const color = categoryColorMap[category] || '#059669'

      // Always create the note in Realm with all fields
      const noteId = noteService.createNote(
        taskData.title,
        taskData.content || '',
        category,
        color,
        false, // isCompleted
        formattedDueDate, // Pass the formatted due date
        normalizedPriority // Pass the normalized priority
      )

      // Create a simple object to pass via navigation params
      const noteData = {
        id: noteId,
        title: taskData.title,
        content: taskData.content || '',
        category: category,
        color: color,
        createdAt: now,
        updatedAt: now,
        dueDate: formattedDueDate,
        priority: normalizedPriority,
        alreadySaved: true
      }

      // Log the note data for debugging
      console.log('Note data being passed to navigation:', noteData)

      // Handle navigation based on the params
      if (params.returnToTabs === 'true') {
        router.replace({
          pathname: '/(tabs)',
          params: {
            newNote: JSON.stringify(noteData),
            timestamp: Date.now()
          }
        })
      } else {
        setTimeout(() => RNExitApp.exitApp(), 1000)
      }

      setCurrentAction('Task saved successfully')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Error preparing task data:', error)
      setCurrentAction('Error saving task')
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  // Finalize task creation
  const finishTask = () => {
    setCurrentStep(1)
    setTranscript('')
    setCurrentAction('Task created successfully')
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    if (animationRef.current) setTimeout(() => animationRef.current.play(), 100)

    setTaskData(prev => ({...prev, created: new Date().toISOString()}))
    setSaveCountdown(AUTO_SAVE_COUNTDOWN)
    setAutoSaving(true)
  }

  // Add a function to show help/tutorial
  const showTutorial = () => {
    Alert.alert('Voice Task Creation', 'You can use these voice commands:\n\n' + '• "Title: Buy groceries"\n' + '• "Description: Milk, eggs, bread"\n' + '• "Due date: Tomorrow"\n' + '• "Category: Shopping"\n' + '• "Priority: High"\n\n' + 'Say "Done" or "Save task" when finished', [{text: 'Got it!'}])
  }

  // Add a help button to the UI
  const HelpButton = () => (
    <TouchableOpacity
      onPress={showTutorial}
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
      }}
    >
      <Text style={{color: 'white', fontWeight: 'bold'}}>?</Text>
    </TouchableOpacity>
  )

  // Helper functions
  const getStepLabel = () => {
    switch (currentStep) {
      case 0:
        return isEditing ? 'Editing Task Title' : 'Recording Task Title'
      default:
        return 'Task Summary'
    }
  }

  const getStepInstructions = () => {
    switch (currentStep) {
      case 0:
        return isEditing ? 'Speak a new title for your task' : 'Speak a clear title for your task'
      default:
        return ''
    }
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <HelpButton />
      <Header router={router} params={params} isDarkMode={isDarkMode} theme={theme} recognizing={recognizing} recordingTime={recordingTime} getStepLabel={getStepLabel} colors={colors} />

      <View style={styles.actionIndicator}>
        <Text style={[styles.actionText, {color: colors.primary}]}>{currentAction}</Text>
      </View>

      <Surface style={[styles.transcriptSurface, {backgroundColor: theme.cardBg}]}>
        <ScrollView contentContainerStyle={styles.transcriptScrollview} showsVerticalScrollIndicator={false}>
          <VoiceWaves showVoiceWaves={showVoiceWaves} recognizing={recognizing} waveAnim1={waveAnim1} waveAnim2={waveAnim2} waveAnim3={waveAnim3} colors={colors} />

          {currentStep === 1 ? <TaskSummary theme={theme} colors={colors} taskData={taskData} autoSaving={autoSaving} saveCountdown={saveCountdown} /> : transcript ? <TranscriptView transcript={transcript} theme={theme} colors={colors} /> : <EmptyState isDarkMode={isDarkMode} colors={colors} theme={theme} getStepInstructions={getStepInstructions} handleStart={handleStart} recognizing={recognizing} currentStep={currentStep} isEditing={isEditing} />}

          <StepIndicator currentStep={currentStep} colors={colors} isDarkMode={isDarkMode} />
        </ScrollView>
      </Surface>

      <View style={styles.controls}>{currentStep < 1 ? <VoiceControls theme={theme} isEditing={isEditing} recognizing={recognizing} autoConfirmCountdown={autoConfirmCountdown} recordingTime={recordingTime} handleStop={handleStop} handleStart={handleStart} colors={colors} /> : <FinalButtons theme={theme} colors={colors} setCurrentStep={setCurrentStep} taskData={taskData} setTranscript={setTranscript} setCurrentAction={setCurrentAction} setAutoSaving={setAutoSaving} setIsEditing={setIsEditing} saveTaskAndNavigate={saveTaskAndNavigate} />}</View>

      <NavigationBarThemeHandler specialState={recognizing} specialColor={recognizing ? (isDarkMode ? 'rgb(29, 21, 21)' : 'rgb(245, 228, 228)') : null} specialButtonStyle={isDarkMode ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 20 : 20},
  actionIndicator: {
    backgroundColor: 'rgba(226, 232, 240, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20
  },
  actionText: {fontSize: 14, fontWeight: '500'},
  transcriptSurface: {
    flex: 1,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 24,
    overflow: 'hidden'
  },
  transcriptScrollview: {flexGrow: 1, justifyContent: 'center', padding: 20},
  controls: {paddingBottom: 40, alignItems: 'center', justifyContent: 'center'}
})

export default NewTask
