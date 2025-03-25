import React, {useState, useEffect, useRef, useReducer} from 'react'
import {View, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Platform, Pressable, Animated, BackHandler, Alert} from 'react-native'
import {ExpoSpeechRecognitionModule} from 'expo-speech-recognition'
import {useSpeechRecognitionEvent} from 'expo-speech-recognition'
import {Text, ActivityIndicator, useTheme as usePaperTheme, Surface} from 'react-native-paper'
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import {StatusBar} from 'expo-status-bar'
import Toast from 'react-native-toast-message'
import {useFocusEffect, useLocalSearchParams, useRouter} from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useTheme} from '@/components/ThemeContext'
import RNExitApp from 'react-native-exit-app'
import {NavigationBarThemeHandler} from '@/components/NavigationBarThemeHandeler'
import {SafeAreaView} from 'react-native-safe-area-context'
import NoteService from '@/services/NoteService'
import {useRealm} from '@/components/RealmContext'
import {useAuth} from '@/components/AuthContext'

const {width} = Dimensions.get('window')
const SPEECH_TIMEOUT = 20000
const AUTO_SAVE_COUNTDOWN = 2
const AUTO_CONFIRM_TIMEOUT = 1000

const NewTask = () => {
  const {colors} = usePaperTheme()
  const {isDarkMode} = useTheme()
  const router = useRouter()
  const realm = useRealm()
  const {user} = useAuth()
  const userId = user?.id || user?._id || user?.userId || (typeof user === 'string' ? user : 'anonymous')
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

  // State consolidation with useReducer
  const [state, dispatch] = useReducer(
    (state, action) => {
      switch (action.type) {
        case 'SET_TASK_DATA':
          return {...state, taskData: {...state.taskData, ...action.payload}}
        case 'SET_RECOGNIZING':
          return {...state, recognizing: action.payload}
        case 'SET_TRANSCRIPT':
          return {...state, transcript: action.payload}
        case 'SET_CURRENT_ACTION':
          return {...state, currentAction: action.payload}
        case 'SET_CURRENT_FIELD':
          return {...state, currentField: action.payload}
        case 'SET_ACTIVE_FIELD_HIGHLIGHT':
          return {...state, activeFieldHighlight: action.payload}
        case 'SET_SHOW_VOICE_WAVES':
          return {...state, showVoiceWaves: action.payload}
        case 'SET_RECORDING_START_TIME':
          return {...state, recordingStartTime: action.payload}
        case 'SET_RECORDING_TIME':
          return {...state, recordingTime: action.payload}
        case 'SET_SAVE_COUNTDOWN':
          return {...state, saveCountdown: action.payload}
        case 'SET_AUTO_SAVING':
          return {...state, autoSaving: action.payload}
        case 'RESET_TASK':
          return {
            ...state,
            taskData: {
              title: '',
              content: '',
              dueDate: '',
              reminder: '',
              category: '',
              priority: params.priority || '',
              created: null
            },
            transcript: ''
          }
        default:
          return state
      }
    },
    {
      recognizing: false,
      taskData: {
        title: '',
        content: '',
        dueDate: '',
        category: '',
        priority: params.priority || '',
        created: null
      },
      transcript: '',
      saveCountdown: AUTO_SAVE_COUNTDOWN,
      autoSaving: false,
      currentAction: '',
      showVoiceWaves: false,
      recordingStartTime: null,
      recordingTime: 0,
      currentField: 'title',
      activeFieldHighlight: ''
    }
  )

  // Extract state variables for easier access
  const {recognizing, taskData, transcript, saveCountdown, autoSaving, currentAction, showVoiceWaves, recordingStartTime, recordingTime, currentField, activeFieldHighlight} = state

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current
  const waveAnim1 = useRef(new Animated.Value(0)).current
  const waveAnim2 = useRef(new Animated.Value(0)).current
  const waveAnim3 = useRef(new Animated.Value(0)).current
  const speechTimeoutRef = useRef(null)

  // Constants
  const keywords = {
    TITLE: ['title', 'task title', 'the title', 'title is', 'name', 'task name', 'create task', 'create a task'],
    DESCRIPTION: ['description', 'details', 'content', 'describe', 'task details', 'the description'],
    DUE_DATE: ['due date', 'deadline', 'due', 'due by', 'when is it due', 'complete by', 'finish by', 'date'],
    CATEGORY: ['category', 'type', 'tag', 'label', 'group', 'the category', 'category is'],
    PRIORITY: ['priority', 'importance', 'urgent', 'high priority', 'low priority', 'medium priority'],
    REMINDER: ['remind me', 'remind me in', 'reminder', 'notify', 'remind']
  }

  const validCategories = ['Tasks', 'Work', 'Projects', 'Personal', 'Meetings', 'Ideas', 'Notes']
  const validPriorities = ['high', 'medium', 'low']

  // Theme object derived from dark mode setting
  const theme = {
    background: isDarkMode ? '#121212' : colors.background,
    surface: isDarkMode ? '#1E1E1E' : colors.surface,
    text: isDarkMode ? '#E1E1E1' : '#1e293b',
    secondaryText: isDarkMode ? '#ABABAB' : '#475569',
    cardBg: isDarkMode ? '#2A2A2A' : '#fff',
    fieldBg: isDarkMode ? '#333333' : '#f8fafc',
    activeFieldBg: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
    fieldBorder: isDarkMode ? 'rgba(80, 80, 80, 0.8)' : 'rgba(226, 232, 240, 0.8)',
    activeFieldBorder: isDarkMode ? '#81ABFF' : '#3b82f6',
    inputBg: isDarkMode ? 'rgba(45, 45, 45, 0.8)' : 'rgba(226, 232, 240, 0.2)',
    voiceControlBg: isDarkMode ? '#333333' : '#f1f5f9',
    statusBar: isDarkMode ? 'light' : 'dark'
  }

  // Handle voice animations
  useEffect(() => {
    if (recognizing) {
      dispatch({type: 'SET_SHOW_VOICE_WAVES', payload: true})

      // Start wave animations with staggered timing
      const animations = [
        [waveAnim1, 700, 0],
        [waveAnim2, 800, 200],
        [waveAnim3, 600, 400]
      ]

      animations.forEach(([anim, duration, delay]) => {
        setTimeout(() => {
          Animated.loop(Animated.sequence([Animated.timing(anim, {toValue: 1, duration, useNativeDriver: true}), Animated.timing(anim, {toValue: 0, duration, useNativeDriver: true})])).start()
        }, delay)
      })
    } else {
      // Reset animations
      ;[waveAnim1, waveAnim2, waveAnim3].forEach(anim => anim.setValue(0))
      dispatch({type: 'SET_SHOW_VOICE_WAVES', payload: false})
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
    return () => pulseAnimation?.stop()
  }, [recognizing])

  // Initialize with deep link params or auto-start voice
  useEffect(() => {
    if (params.content) {
      dispatch({
        type: 'SET_TASK_DATA',
        payload: {title: params.content, priority: params.priority || ''}
      })
      dispatch({type: 'SET_TRANSCRIPT', payload: params.content})
      Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      if (params.autoStart === 'true') {
        setTimeout(() => saveTaskAndNavigate(), 1000)
      }
    } else {
      const timer = setTimeout(() => {
        if (!recognizing && !transcript && !taskData.title) {
          dispatch({type: 'SET_CURRENT_ACTION', payload: 'Starting voice input...'})
          handleStart()
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  // Recording duration timer
  useEffect(() => {
    let interval
    if (recognizing) {
      interval = setInterval(() => {
        dispatch({
          type: 'SET_RECORDING_TIME',
          payload: Math.floor((Date.now() - (recordingStartTime || Date.now())) / 1000)
        })
      }, 1000)
    } else {
      dispatch({type: 'SET_RECORDING_TIME', payload: 0})
    }
    return () => clearInterval(interval)
  }, [recognizing, recordingStartTime])

  // Auto-save countdown
  useEffect(() => {
    if (autoSaving && saveCountdown > 0) {
      const timer = setTimeout(() => dispatch({type: 'SET_SAVE_COUNTDOWN', payload: saveCountdown - 1}), 1000)
      return () => clearTimeout(timer)
    } else if (autoSaving && saveCountdown === 0) {
      // Validate before saving
      const validationIssues = validateTask()
      if (validationIssues.length > 0) {
        dispatch({type: 'SET_AUTO_SAVING', payload: false})
        dispatch({type: 'SET_CURRENT_ACTION', payload: `Please fix: ${validationIssues.join(', ')}`})
        Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      } else {
        saveTaskAndNavigate()
      }
    }
  }, [autoSaving, saveCountdown])

  useEffect(() => {
    // If title is filled but other fields are not set, start a countdown for auto-save
    if (taskData.title && !autoSaving) {
      const timer = setTimeout(() => {
        dispatch({type: 'SET_CURRENT_ACTION', payload: 'Auto-saving will begin soon...'})
        if (!recognizing) {
          dispatch({type: 'SET_AUTO_SAVING', payload: true})
          dispatch({type: 'SET_SAVE_COUNTDOWN', payload: AUTO_SAVE_COUNTDOWN})
        }
      }, 5000) // 5 seconds after title is set

      return () => clearTimeout(timer)
    }
  }, [taskData.title, autoSaving, recognizing])

  // Speech timeout handling
  useEffect(() => {
    if (recognizing) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = setTimeout(() => {
        if (recognizing && !transcript) {
          dispatch({type: 'SET_CURRENT_ACTION', payload: 'No speech detected, stopping...'})
          handleStop()
        }
      }, SPEECH_TIMEOUT)
    }
    return () => clearTimeout(speechTimeoutRef.current)
  }, [recognizing, transcript])

  // Highlight active field when changing
  useEffect(() => {
    if (currentField) {
      dispatch({type: 'SET_ACTIVE_FIELD_HIGHLIGHT', payload: currentField})

      // Add a small bounce animation
      const targetField = currentField
      Animated.sequence([Animated.timing(pulseAnim, {toValue: 1.05, duration: 200, useNativeDriver: true}), Animated.timing(pulseAnim, {toValue: 1, duration: 200, useNativeDriver: true})]).start()

      const timer = setTimeout(() => dispatch({type: 'SET_ACTIVE_FIELD_HIGHLIGHT', payload: ''}), 2000)
      return () => clearTimeout(timer)
    }
  }, [currentField])

  // Speech recognition event handlers
  useSpeechRecognitionEvent('start', () => {
    dispatch({type: 'SET_RECOGNIZING', payload: true})
    dispatch({type: 'SET_RECORDING_START_TIME', payload: Date.now()})
    Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
    dispatch({type: 'SET_CURRENT_ACTION', payload: 'Listening...'})
  })

  useSpeechRecognitionEvent('end', () => {
    dispatch({type: 'SET_RECOGNIZING', payload: false})
    Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    if (transcript) {
      dispatch({type: 'SET_CURRENT_ACTION', payload: 'Processing your input...'})
      setTimeout(() => {
        dispatch({type: 'SET_CURRENT_ACTION', payload: 'Ready - tap mic to add more details'})
      }, 1500)
    } else {
      dispatch({type: 'SET_CURRENT_ACTION', payload: 'Ready - tap mic to add details'})
    }
  })

  useSpeechRecognitionEvent('result', event => {
    const newTranscript = event.results[0]?.transcript || ''
    dispatch({type: 'SET_TRANSCRIPT', payload: newTranscript})

    // Process the transcript
    if (newTranscript.trim()) {
      processSpeechInput(newTranscript, event.isFinal)
    }

    // Reset speech timeout
    clearTimeout(speechTimeoutRef.current)
    speechTimeoutRef.current = setTimeout(() => {
      if (recognizing) handleStop()
    }, SPEECH_TIMEOUT)
  })

  const provideFeedbackOnFieldCompletion = (field, value) => {
    if (!value || value === taskData[field]) return

    // When important fields are filled, provide haptic feedback and visual cue
    if (['title', 'dueDate', 'category', 'priority'].includes(field)) {
      Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

      // Display a success message
      dispatch({
        type: 'SET_CURRENT_ACTION',
        payload: `${field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')} set successfully!`
      })

      // If title is set, start thinking about auto-saving
      if (field === 'title' && !autoSaving) {
        setTimeout(() => {
          dispatch({type: 'SET_CURRENT_ACTION', payload: 'Ready to save or add more details'})
        }, 2000)
      }
    }
  }

  // Helper functions for speech processing
  const processSpeechInput = (text, isFinal) => {
    const lowerText = text.toLowerCase()
    const commandKeywords = ['save task', 'finish task', "that's it", 'complete task', 'save', 'finish']

    // Check for command keywords first
    if (isFinal && commandKeywords.some(keyword => lowerText.includes(keyword))) {
      handleStop()
      setTimeout(() => finishTask(), 200)
      return
    }

    // Check for field keywords
    let fieldDetected = false
    for (const [field, fieldKeywords] of Object.entries(keywords)) {
      if (containsAny(lowerText, fieldKeywords)) {
        const fieldName = field.toLowerCase()
        const content = extractContentAfterKeyword(text, lowerText, fieldKeywords)

        // Skip if it looks like a command
        if (content && commandKeywords.some(cmd => content.toLowerCase().includes(cmd))) {
          continue
        }

        dispatch({type: 'SET_CURRENT_FIELD', payload: fieldName})
        dispatch({type: 'SET_CURRENT_ACTION', payload: `Processing ${fieldName.replace('_', ' ')}...`})

        if (content && content.trim().length > 0) {
          updateTaskField(fieldName, content)
          dispatch({type: 'SET_CURRENT_ACTION', payload: `${fieldName.replace('_', ' ')} captured: "${content}"`})
        }
        fieldDetected = true
        break
      }
    }

    // If no keyword found, assume content is for current field
    if (!fieldDetected && text.trim() && !commandKeywords.some(cmd => lowerText.includes(cmd))) {
      updateTaskField(currentField, text)
      dispatch({type: 'SET_CURRENT_ACTION', payload: `${currentField.replace('_', ' ')} updated: "${text}"`})
    }
  }

  // Helper function to update task data based on field
  const updateTaskField = (field, content) => {
    switch (field) {
      case 'title':
        dispatch({type: 'SET_TASK_DATA', payload: {title: content}})
        provideFeedbackOnFieldCompletion('title', content)
        break
      case 'description':
        dispatch({type: 'SET_TASK_DATA', payload: {content: content}})
        provideFeedbackOnFieldCompletion('content', content)
        break
      case 'due_date':
        dispatch({type: 'SET_TASK_DATA', payload: {dueDate: processDateString(content)}})
        break
      case 'reminder':
        dispatch({type: 'SET_TASK_DATA', payload: {reminder: processReminderString(content)}})
        break
      case 'category':
        dispatch({
          type: 'SET_TASK_DATA',
          payload: {
            category: findClosestCategory(content, validCategories) || 'Tasks'
          }
        })
        break
      case 'priority':
        dispatch({
          type: 'SET_TASK_DATA',
          payload: {
            priority: findClosestPriority(content, validPriorities) || 'medium'
          }
        })
        break
    }

    if (taskData.title && (field === 'description' || field === 'category' || field === 'dueDate' || field === 'priority')) {
      // If we have title and one of these important fields, suggest saving
      setTimeout(() => {
        dispatch({type: 'SET_CURRENT_ACTION', payload: 'Ready to save. Say "save task" to finish.'});
      }, 1000);
    }
    
  }

// ✅ Helper function to get current IST date and time
const getISTDate = () => {
  const now = new Date();
  const istOffset = 5.5 * 60; // IST offset in minutes
  const istTime = new Date(now.getTime() + istOffset * 60 * 1000);
  return istTime;
};

// ✅ Helper function to format date in IST (YYYY-MM-DD)
const formatDateIST = (date) => {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const weekday = require('dayjs/plugin/weekday');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');

dayjs.extend(customParseFormat);
dayjs.extend(weekday);
dayjs.extend(isSameOrAfter);

const convertTo24HourFormat = (hour, minute, meridiem) => {
  hour = parseInt(hour);
  minute = parseInt(minute) || 0;

  if (meridiem) {
    meridiem = meridiem.toLowerCase();
    if (meridiem === 'p.m.' && hour < 12) {
      hour += 12; // Convert PM to 24-hour format
    } else if (meridiem === 'a.m.' && hour === 12) {
      hour = 0; // Convert 12 AM to 00:00
    }
  }

  const formattedHour = hour.toString().padStart(2, '0');
  const formattedMinute = minute.toString().padStart(2, '0');

  return `${formattedHour}:${formattedMinute}`;
};

const getNextWeekdayDate = (weekdayName) => {
  const today = dayjs();
  const targetDay = dayjs().day(weekdayName.toLowerCase());
  if (targetDay.isSameOrAfter(today, 'day')) {
    return targetDay;
  }
  return targetDay.add(1, 'week');
};

const processReminderString = (reminderText) => {
  const lowerReminderText = reminderText.toLowerCase().trim();

  const timeRegex = /(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)/i;
  const dateRegex = /(\d{1,2})(st|nd|rd|th)?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;
  const weekdayRegex = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;
  const tomorrowRegex = /\b(tomorrow)\b/i;

  let date = dayjs();

  // ✅ Handle tomorrow
  if (tomorrowRegex.test(lowerReminderText)) {
    date = date.add(1, 'day');
  }

  // ✅ Handle specific date (e.g., 21st March)
  const dateMatch = lowerReminderText.match(dateRegex);
  if (dateMatch) {
    const [, day, , month] = dateMatch;
    const formattedDate = `${day} ${month}`;
    date = dayjs(formattedDate, 'D MMM');
  }

  // ✅ Handle weekdays (e.g., "Monday at 2:30 p.m.")
  const weekdayMatch = lowerReminderText.match(weekdayRegex);
  if (weekdayMatch) {
    const weekdayName = weekdayMatch[1];
    date = getNextWeekdayDate(weekdayName);
  }

  // ✅ Handle time
  const timeMatch = lowerReminderText.match(timeRegex);
  if (timeMatch) {
    const [_, hour, minute, meridiem] = timeMatch;
    const formattedTime = convertTo24HourFormat(hour, minute, meridiem);

    // 🛠️ Return in "HH:MM on YYYY-MM-DD" format
    const finalDateTime = `${formattedTime} on ${date.format('YYYY-MM-DD')}`;
    return finalDateTime;
  }

  return `Invalid date or time format: ${reminderText}`;
};
// ✅ Helper function to process date strings
const processDateString = (dateText) => {
  const lowerDateText = dateText.toLowerCase().trim();
  const today = getISTDate();

  const monthNames = [
    'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr',
    'may', 'june', 'jun', 'july', 'jul', 'august', 'aug', 'september', 'sep',
    'october', 'oct', 'november', 'nov', 'december', 'dec'
  ];

  // Date patterns
  const datePatterns = [
    /^(?:(\w+)\s+(\d+)(?:st|nd|rd|th)?)$/i,
    /^(?:(\d+)(?:st|nd|rd|th)?\s+of\s+(\w+))$/i
  ];

  for (const pattern of datePatterns) {
    const match = lowerDateText.match(pattern);
    if (match) {
      let monthPart, dayPart;
      if (isNaN(parseInt(match[1]))) {
        monthPart = match[1];
        dayPart = match[2];
      } else {
        monthPart = match[2];
        dayPart = match[1];
      }

      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthPart.toLowerCase());
      if (monthIndex !== -1) {
        const standardMonthIndex = Math.floor(monthIndex / 2);
        const year = today.getFullYear();

        const specificDate = new Date(year, standardMonthIndex, parseInt(dayPart));
        return formatDateIST(specificDate);
      }
    }
  }

  if (lowerDateText.includes('today')) {
    return formatDateIST(today);
  }

  if (lowerDateText.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateIST(tomorrow);
  }

  try {
    const parts = dateText.match(/(\d+)/g);
    if (parts && parts.length >= 2) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parts.length > 2 ? parseInt(parts[2]) : today.getFullYear();

      const specificDate = new Date(year, month, day);
      return formatDateIST(specificDate);
    }
  } catch (e) {
    console.log('Error parsing date:', e);
  }

  return null;
};


  
  
  

  // Helper functions for matching categories and priorities
  const findClosestCategory = (input, categories) => {
    // Direct match first
    const lowerInput = input.toLowerCase().trim()
    const directMatch = categories.find(c => lowerInput.includes(c.toLowerCase()))
    return directMatch || categories[0]
  }

  const findClosestPriority = (input, priorities) => {
    const lowerInput = input.toLowerCase().trim()
    // Direct match
    for (const priority of priorities) {
      if (lowerInput.includes(priority)) return priority
    }
    // Handle common expressions
    if (lowerInput.includes('urgent') || lowerInput.includes('important')) return 'high'
    if (lowerInput.includes('not urgent') || lowerInput.includes('can wait')) return 'low'
    return 'medium'
  }

  // Helper functions for text processing
  const containsAny = (text, keywords) => {
    return keywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i')
      return regex.test(text)
    })
  }

  const extractContentAfterKeyword = (text, lowerText, keywords) => {
    const commandKeywords = ['save task', 'finish task', "that's it", 'complete task']

    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        const keywordIndex = lowerText.indexOf(keyword.toLowerCase())
        let content = text.substring(keywordIndex + keyword.length).trim()

        // If the content contains a command keyword, don't extract that part
        for (const cmdKeyword of commandKeywords) {
          const cmdIndex = content.toLowerCase().indexOf(cmdKeyword)
          if (cmdIndex !== -1) {
            content = content.substring(0, cmdIndex).trim()
          }
        }

        if (content && !['is', 'the', 'a', 'an', 'this', 'that'].includes(content.toLowerCase())) {
          return content
        }
      }
    }
    return null
  }

  // Voice command processor
  const processVoiceCommand = command => {
    if (handleVoiceCommand(command)) {
      Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
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
      dispatch({type: 'SET_CURRENT_ACTION', payload: 'Voice input cancelled'})
      return true
    }

    if (lowerCommand.includes('save task') || lowerCommand.includes('finish task') || lowerCommand.includes("that's it")) {
      handleStop()
      setTimeout(() => finishTask(), 500)
      return true
    }

    if (lowerCommand.includes('start over') || lowerCommand.includes('reset')) {
      handleStop()
      dispatch({type: 'RESET_TASK'})
      dispatch({type: 'SET_CURRENT_ACTION', payload: 'Starting over...'})
      return true
    }

    return false
  }

  // Start speech recognition
  const handleStart = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!result.granted) {
      Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      dispatch({type: 'SET_CURRENT_ACTION', payload: 'Microphone permission denied'})
      return
    }

    dispatch({type: 'SET_CURRENT_ACTION', payload: "I'm listening... Say title, description, due date, category, or priority"})

    const contextualStrings = ['save task', 'reminder', 'remind me', 'remind me in', 'finish task', "that's it", 'cancel', 'stop', 'start over', 'reset', 'title', 'description', 'due date', 'category', 'priority', 'task', 'project', 'deadline', 'work', 'personal', 'high', 'medium', 'low', 'notes', 'meetings', 'create task', 'todo', 'to-do', 'today', 'tomorrow', 'next week', 'days from now', 'next month', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
      contextualStrings
    })
  }

  // Stop speech recognition
  const handleStop = () => {
    ExpoSpeechRecognitionModule.stop()
    Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    dispatch({type: 'SET_CURRENT_ACTION', payload: 'Processing...'})
  }

  // Task validation
  const validateTask = () => {
    const issues = []
    if (!taskData.title || taskData.title.trim() === '') {
      issues.push('Title is required')
    }
    return issues
  }

  const isValidDate = dateString => {
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return true
    }
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }

  // Save task and prepare for auto-save
  const finishTask = () => {
    dispatch({type: 'SET_TRANSCRIPT', payload: ''})
    dispatch({type: 'SET_CURRENT_ACTION', payload: 'Task ready to save'})
    Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    dispatch({
      type: 'SET_TASK_DATA',
      payload: {created: new Date().toISOString()}
    })

    dispatch({type: 'SET_SAVE_COUNTDOWN', payload: AUTO_SAVE_COUNTDOWN})
    dispatch({type: 'SET_AUTO_SAVING', payload: true})
  }

  const exitApp = () => {

    if (Platform.OS === 'web') {

      console.log('Exit app called in web - closing window')

      try {

        

        setTimeout(() => {

          console.log('Browser may have blocked window.close(). Please close this tab manually.')

          // You could redirect to a different page instead

          // window.location.href = '/dashboard'

        }, 300)

      } catch (error) {

        console.error('Error closing window:', error)

      }

    } else {

      // Import dynamically only on native platforms

      const RNExitApp = require('react-native-exit-app').default

      RNExitApp.exitApp()

    }

  }



  // Save task and navigate
  const saveTaskAndNavigate = () => {
    try {
      const now = new Date()
      let normalizedPriority = (taskData.priority || 'medium').toLowerCase()
      if (!validPriorities.includes(normalizedPriority)) {
        normalizedPriority = 'medium'
      }

      // Process due date
      let formattedDueDate = null
      if (taskData.dueDate) {
        if (typeof taskData.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(taskData.dueDate)) {
          formattedDueDate = taskData.dueDate
        } else {
          try {
            const date = new Date(taskData.dueDate)

            // ✅ Convert date to IST
            const offset = 5.5 * 60 * 60 * 1000
            date.setTime(date.getTime() + offset)

            formattedDueDate = date.toLocaleDateString('en-CA') // YYYY-MM-DD format
          } catch (e) {
            console.error('Error formatting date:', e)
          }
        }
      }
      
      let reminderValue = null
      if (taskData.reminder) {
        reminderValue = taskData.reminder
      }

      const categoryColorMap = {
        Tasks: '#059669',
        Work: '#4F46E5',
        Ideas: '#DB2777',
        Personal: '#D97706',
        Projects: '#7C3AED',
        Meetings: '#BE123C',
        Notes: '#4F46E5'
      }

      const category = (taskData.category || 'Tasks').trim()
      const color = categoryColorMap[category] || '#059669'

      // Create the note
      const noteId = noteService.createNote(taskData.title, taskData.content || '', category, color, false, formattedDueDate, normalizedPriority, reminderValue)

      const noteData = {
        id: noteId,
        title: taskData.title,
        content: taskData.content || '',
        category,
        color,
        createdAt: now,
        updatedAt: now,
        dueDate: formattedDueDate,
        priority: normalizedPriority,
        reminder: reminderValue,
        alreadySaved: true
      }

      // Navigate based on parameters
      if (params.returnToTabs === 'true') {
        router.replace({
          pathname: '/(tabs)',
          params: {
            newNote: JSON.stringify(noteData),
            timestamp: Date.now()
          }
        })
      } else {
        if (Platform.OS === 'web') {

          console.log('Task created in web')

        } else {

          setTimeout(() => exitApp(), 1000)

        }
      }

      dispatch({type: 'SET_CURRENT_ACTION', payload: 'Task saved successfully'})
      Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Error preparing task data:', error)
      dispatch({type: 'SET_CURRENT_ACTION', payload: 'Error saving task'})
      Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }

  // Show tutorial
  const showTutorial = () => {
    Alert.alert('Voice Task Creation', 'You can use these voice commands:\n\n' + '• "Title: Buy groceries"\n' + '• "Description: Milk, eggs, bread"\n' + '• "Due date: Tomorrow"\n' + '• "Remind me: in 2 hours"\n' + '• "Category: Personal"\n' + '• "Priority: High"\n\n' + 'Say "Finish" or "Save task" when finished', [{text: 'Got it!'}])
  }

  // Format date for display
  const formatDate = dateString => {
    if (!dateString) return null

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString

      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (date.toDateString() === today.toDateString()) {
        return 'Today'
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow'
      } else {
        return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})
      }
    } catch (e) {
      return dateString
    }
  }

  // UI Components

  // Field component
  const TaskField = ({label, value, fieldKey, icon}) => {
    const isActive = activeFieldHighlight === fieldKey
    const fieldIcons = {
      title: 'edit-3',
      description: 'align-left',
      due_date: 'calendar',
      category: 'tag',
      priority: 'flag',
      reminder: 'bell'
    }

    const fieldIcon = icon || fieldIcons[fieldKey] || 'circle'
    const isGridField = ['due_date', 'category', 'priority', 'reminder'].includes(fieldKey)

    const handleFieldTap = () => {
      dispatch({type: 'SET_CURRENT_FIELD', payload: fieldKey})
      if (!recognizing) {
        handleStart()
        setTimeout(() => {
          dispatch({type: 'SET_CURRENT_ACTION', payload: `Tell me the ${label.toLowerCase()}...`})
        }, 500)
      }
    }

    return (
      <TouchableOpacity
        style={[
          styles.fieldContainer,
          isGridField && styles.smallFieldContainer,
          {
            backgroundColor: isActive ? theme.activeFieldBg : theme.fieldBg,
            borderColor: isActive ? theme.activeFieldBorder : theme.fieldBorder
          }
        ]}
        onPress={handleFieldTap}
      >
        <View style={styles.fieldHeader}>
          <Feather name={fieldIcon} size={16} color={colors.primary} style={styles.fieldIcon} />
          <Text style={[styles.fieldLabel, {color: theme.secondaryText}]}>{label}</Text>
        </View>

        {value ? (
          <Text style={[styles.fieldValue, isGridField && styles.smallFieldValue, {color: theme.text}]} numberOfLines={fieldKey === 'description' ? 2 : 1}>
            {fieldKey === 'due_date' ? formatDate(value) : fieldKey === 'priority' ? value.charAt(0).toUpperCase() + value.slice(1) : value}
          </Text>
        ) : (
          <Text style={[styles.fieldPlaceholder, isGridField && styles.smallFieldPlaceholder, {color: theme.secondaryText}]}>{`Tap to add`}</Text>
        )}
      </TouchableOpacity>
    )
  }

  // Voice button component
  const VoiceButton = () => (
    <Animated.View style={[styles.voiceButtonContainer, {transform: [{scale: pulseAnim}]}]}>
      <TouchableOpacity style={[styles.voiceButton, {backgroundColor: recognizing ? colors.error : colors.primary}]} onPress={recognizing ? handleStop : handleStart}>
        <Feather name={recognizing ? 'x' : 'mic'} size={24} color="white" />
      </TouchableOpacity>

      {recognizing && <Text style={styles.recordingTime}>{recordingTime > 0 ? `${recordingTime}s` : ''}</Text>}
    </Animated.View>
  )

  // VoiceWaves component (optimized from your second document)
  const VoiceWaves = () => {
    if (!showVoiceWaves) return null

    // Optimized array mapping for the waves
    return (
      <View style={styles.waveContainer}>
        {[
          {anim: waveAnim1, height: 12},
          {anim: waveAnim2, height: 18},
          {anim: waveAnim3, height: 14}
        ].map((wave, index) => (
          <Animated.View
            key={`wave-${index}`}
            style={[
              styles.wave,
              {
                height: wave.height,
                backgroundColor: colors.primary,
                opacity: wave.anim,
                transform: [
                  {
                    scaleY: wave.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.2, 1]
                    })
                  }
                ]
              }
            ]}
          />
        ))}
      </View>
    )
  }

  // Help button component (simplified)
  const HelpButton = () => (
    <TouchableOpacity style={styles.helpButton} onPress={showTutorial}>
      <Feather name="help-circle" size={20} color={colors.primary} />
    </TouchableOpacity>
  )

  // Action indicator with wave animations
  const ActionIndicator = () => (
    <View style={[styles.actionIndicator, {backgroundColor: theme.voiceControlBg}]}>
      <Text style={[styles.actionText, {color: colors.primary}]}>{currentAction}</Text>
      {showVoiceWaves && <VoiceWaves />}
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: theme.background}]}>
      <StatusBar style={theme.statusBar} />
      {/* Header area */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace({pathname: '/(tabs)'})}>
          <Feather name="arrow-left" size={20} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, {color: theme.text}]}>
          New Task
          {recognizing && recordingTime > 0 ? ` (${recordingTime}s)` : ''}
        </Text>

        <HelpButton />
      </View>
      <ActionIndicator />

      <ScrollView style={[styles.formContainer, {backgroundColor: theme.cardBg}]} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <TaskField label="Title" value={taskData.title} fieldKey="title" />
        <TaskField label="Description" value={taskData.content} fieldKey="description" />

        <View style={styles.gridContainer}>
          <View style={styles.gridColumn}>
            <TaskField label="Due Date" value={taskData.dueDate} fieldKey="due_date" icon="calendar" />
            <TaskField label="Category" value={taskData.category} fieldKey="category" icon="tag" />
          </View>
          <View style={styles.gridColumn}>
            <TaskField label="Reminder" value={taskData.reminder} fieldKey="reminder" icon="bell" />
            <TaskField label="Priority" value={taskData.priority} fieldKey="priority" icon="flag" />
          </View>
        </View>

        {transcript && (
          <View style={styles.transcriptContainer}>
            <Text style={[styles.transcriptLabel, {color: theme.secondaryText}]}>Heard:</Text>
            <Text style={[styles.transcriptText, {color: theme.text}]}>{transcript}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomControls}>
        <VoiceButton />

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: taskData.title ? colors.primary : theme.voiceControlBg,
              opacity: taskData.title ? 1 : 0.5
            }
          ]}
          onPress={finishTask}
          disabled={!taskData.title}
        >
          <Feather name="check" size={22} color={taskData.title ? 'white' : theme.secondaryText} />
          <Text style={[styles.saveButtonText, {color: taskData.title ? 'white' : theme.secondaryText}]}>{autoSaving ? `Saving (${saveCountdown})` : 'Save Task'}</Text>
        </TouchableOpacity>
      </View>

      {recognizing && (
        <View style={[styles.voiceControlsContainer, {backgroundColor: theme.voiceControlBg}]}>
          {[
            {icon: 'x-circle', text: 'Cancel', command: 'cancel', color: theme.secondaryText},
            {icon: 'refresh-cw', text: 'Reset', command: 'reset', color: theme.secondaryText},
            {icon: 'check-circle', text: 'Done', command: 'done', color: colors.primary}
          ].map((control, index) => (
            <TouchableOpacity key={`control-${index}`} style={styles.voiceControlButton} onPress={() => processVoiceCommand(control.command)}>
              <Feather name={control.icon} size={18} color={control.color} />
              <Text style={[styles.voiceControlText, {color: control.color}]}>{control.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <NavigationBarThemeHandler specialState={recognizing} specialColor={recognizing ? (isDarkMode ? 'rgb(29, 21, 21)' : 'rgb(245, 228, 228)') : null} specialButtonStyle={isDarkMode ? 'light' : 'dark'} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 8},
  backButton: {padding: 8},
  helpButton: {padding: 8},
  headerTitle: {fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center'},
  actionIndicator: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, margin: 8, marginHorizontal: 16},
  actionText: {fontSize: 14, fontWeight: '500'},
  formContainer: {flex: 1, margin: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2},
  formContent: {padding: 16, paddingBottom: 24},
  fieldContainer: {borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12},
  fieldHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  fieldIcon: {marginRight: 8},
  fieldLabel: {fontSize: 13, fontWeight: '500'},
  fieldValue: {fontSize: 16, fontWeight: '400', marginTop: 2},
  fieldPlaceholder: {fontSize: 15, fontWeight: '400', fontStyle: 'italic', marginTop: 2},
  transcriptContainer: {marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(100,100,100,0.2)', borderStyle: 'dashed'},
  transcriptLabel: {fontSize: 13, fontWeight: '500', marginBottom: 4},
  transcriptText: {fontSize: 14, lineHeight: 20, fontStyle: 'italic'},
  bottomControls: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 16},
  voiceButtonContainer: {alignItems: 'center'},
  voiceButton: {width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3},
  recordingTime: {marginTop: 4, fontSize: 12, fontWeight: '500', color: '#666'},
  saveButton: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, flex: 1, marginLeft: 16, borderRadius: 12, paddingHorizontal: 16},
  saveButtonText: {marginLeft: 8, fontSize: 16, fontWeight: '600'},
  voiceControlsContainer: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(100,100,100,0.1)'},
  voiceControlButton: {alignItems: 'center', padding: 8},
  voiceControlText: {fontSize: 12, marginTop: 4},
  waveContainer: {flexDirection: 'row', height: 20, alignItems: 'center', marginLeft: 12},
  wave: {width: 3, marginHorizontal: 2, borderRadius: 1},
  gridContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 10
  },
  gridColumn: {
    flex: 1,
    marginHorizontal: 5
  },
  smallFieldContainer: {
    height: 85,
    marginBottom: 10
  },
  smallFieldValue: {
    fontSize: 14
  },
  smallFieldPlaceholder: {
    fontSize: 12
  }
})

export default NewTask