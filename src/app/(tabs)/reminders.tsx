import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  View, Text, StyleSheet, FlatList, Pressable, Platform, Modal, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, Keyboard, Alert, ScrollView, SafeAreaView,
  useColorScheme
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import DateTimePicker from "@react-native-community/datetimepicker"
import { format, parseISO } from "date-fns"
import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import Constants from "expo-constants"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { ReminderCard } from "@/components/cards/ReminderCard"
import { useTheme } from "@/components/ThemeContext"
import * as NavigationBar from "expo-navigation-bar";
import { useScreenDetails } from "@/components/OrientationControl"

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
})

// Categories with their properties
const CATEGORIES = [
  { name: "Work", color: "#4F46E5", darkColor: "#818CF8", icon: "briefcase-outline" },
  { name: "Personal", color: "#059669", darkColor: "#34D399", icon: "person-outline" },
  { name: "Projects", color: "#7C3AED", darkColor: "#A78BFA", icon: "construct-outline" },
  { name: "Health", color: "#DC2626", darkColor: "#F87171", icon: "fitness-outline" },
  { name: "Learning", color: "#D97706", darkColor: "#FBBF24", icon: "book-outline" },
]

// Category emoji map for notifications
const CATEGORY_EMOJIS = {
  "Work": "💼", "Personal": "👤", "Projects": "🛠️", 
  "Health": "💪", "Learning": "📚"
}

// Priority emoji map
const PRIORITY_EMOJIS = { high: "🔴", medium: "🟠", low: "🟢" }

// Helper function to set navigation bar theme based on current theme
const setNavigationBarTheme = (isDarkMode) => {
  if (Platform.OS === "android") {
    // Set navigation bar color based on theme
    NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgb(30, 30, 30)" : "#ffffff")
      .catch(error => {
        console.error("Failed to set navigation bar color:", error);
      });
    
    // Set button style based on theme
    NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark")
      .catch(error => {
        console.error("Failed to set navigation bar button style:", error);
      });
    
    // Set position
    NavigationBar.setPositionAsync("relative")
      .catch(error => {
        console.error("Failed to set navigation bar position:", error);
      });
      
    // Set visibility
    NavigationBar.setVisibilityAsync("visible")
      .catch(error => {
        console.error("Failed to set navigation bar visibility:", error);
      });
  }
};


export default function RemindersScreen() {
  const { isDarkMode } = useTheme();
  
  // Create theme-based colors
  const colors = {
    background: isDarkMode ? '#121212' : "#f8fafc",
    card: isDarkMode ? '#1E1E1E' : '#fff',
    cardBorder: isDarkMode ? "#2D3748" : "#f1f5f9",
    text: isDarkMode ? '#E5E7EB' : '#1e293b',
    subText: isDarkMode ? '#9CA3AF' : '#475569',
    input: isDarkMode ? 'rgba(45, 55, 72, 0.5)' : 'rgba(226, 232, 240, 0.2)',
    inputBorder: isDarkMode ? 'rgba(75, 85, 99, 0.8)' : 'rgba(226, 232, 240, 0.8)',
    accent: isDarkMode ? "#6366f1" : "rgb(78, 70, 229)",
    accentLight: isDarkMode ? "rgba(99, 102, 241, 0.15)" : "rgba(224, 231, 255, 0.6)",
    accentBorder: isDarkMode ? "#4F46E5" : "#DDD6FE",
    modalBackground: isDarkMode ? "rgba(0, 0, 0, 0.7)" : "rgba(0, 0, 0, 0.5)",
    modalOverlay: isDarkMode ? "#1E1E1E" : "#ffffff",
    deleteBackground: isDarkMode ? "#1A1818" : "#fef2f2",
    deleteBorder: isDarkMode ? "#991B1B" : "#fecaca",
    deleteText: isDarkMode ? "#F87171" : "#DC2626",
    shadow: isDarkMode ? "#000000" : "#000000",
  }
  
  // Core state
  const [reminders, setReminders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [expoPushToken, setExpoPushToken] = useState("")
  const swipeableRefs = useRef({})
  const notificationListener = useRef()
  const responseListener = useRef()
  const lastUpdateTimestamp = useRef(0)
  
  // Modal and form state
  const [modalVisible, setModalVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentReminder, setCurrentReminder] = useState(null)
  const [title, setTitle] = useState("")
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [datePickerMode, setDatePickerMode] = useState("date")
  const [priority, setPriority] = useState("medium")
  const [category, setCategory] = useState("Work")
  const [reminderTime, setReminderTime] = useState(15)

  useEffect(() => {
    console.log(`Theme changed in ReminderScreen, isDarkMode: ${isDarkMode}`);
    setNavigationBarTheme(isDarkMode);
    
    // Set up an interval to ensure the navigation bar remains in the correct position and theme
    const interval = setInterval(() => {
      setNavigationBarTheme(isDarkMode);
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, [isDarkMode]);

  // Additional effect to update navigation bar when modal state changes
  useEffect(() => {
    // Short delay to ensure theme is applied after modal animations
    const timeoutId = setTimeout(() => {
      setNavigationBarTheme(isDarkMode);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [modalVisible, showDatePicker, isDarkMode]);

  // Parse date string to Date object
  const parseReminderDate = useCallback((dateString) => {
    const dateParts = dateString.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) ([AP]M)/)
    if (dateParts) {
      const [_, year, month, day, hours, minutes, ampm] = dateParts
      let hour = parseInt(hours)
      if (ampm === "PM" && hour < 12) hour += 12
      if (ampm === "AM" && hour === 12) hour = 0
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour, parseInt(minutes))
    }
    return new Date()
  }, [])

  // Schedule notification with simplified approach
  const scheduleNotification = useCallback(async (reminder) => {
    if (reminder.completed) return null
    
    try {
      // Clean up existing notifications
      if (reminder.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId)
          .catch(() => {})
      }
      if (reminder.preReminderId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.preReminderId)
          .catch(() => {})
      }
      
      const notificationDate = parseReminderDate(reminder.date)
      const now = new Date()
      const millisUntilReminder = notificationDate.getTime() - now.getTime()
      
      // Skip if time has already passed (negative difference)
      if (millisUntilReminder < 0) return null
      
      const result = { mainId: null, preReminderId: null }
      const categoryEmoji = CATEGORY_EMOJIS[reminder.category] || "📝"
      const categoryObj = CATEGORIES.find(c => c.name === reminder.category) || CATEGORIES[0]
      
      // For very near future reminders (within 60 seconds), add small buffer to ensure proper scheduling
      const scheduledTime = Math.max(notificationDate.getTime(), now.getTime() + 2000)
      
      // Schedule main notification with precise timing
      await new Promise(resolve => setTimeout(resolve, 50))
      const mainId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${PRIORITY_EMOJIS[reminder.priority] || "🔴"} ${reminder.title}`,
          body: `${categoryEmoji} ${reminder.category} reminder now`,
          data: { reminderId: reminder.id, type: "main" },
          sound: true,
          badge: 1,
          color: isDarkMode ? categoryObj.darkColor : categoryObj.color,
        },
        trigger: { 
          date: new Date(scheduledTime)  // Use date instead of timestamp for more precision
        },
      })
      result.mainId = mainId
      
      // Pre-reminder handling
      const preReminderMinutes = reminder.reminderTime || 15
      const preReminderMillis = preReminderMinutes * 60 * 1000
      
      // Only schedule pre-reminder if we have enough time before the actual reminder
      if (millisUntilReminder > preReminderMillis + 5000) {  // Add 5 second buffer
        const preReminderTime = notificationDate.getTime() - preReminderMillis
        await new Promise(resolve => setTimeout(resolve, 50))
        const preId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 Coming up: ${reminder.title}`,
            body: `${reminder.category} reminder in ${preReminderMinutes} minutes`,
            data: { reminderId: reminder.id, type: "pre-reminder" },
            sound: true,
            badge: 1,
            color: isDarkMode ? categoryObj.darkColor : categoryObj.color,
          },
          trigger: { 
            date: new Date(preReminderTime)  // Use date instead of timestamp
          },
        })
        result.preReminderId = preId
      } else if (millisUntilReminder > 60000) {
        // If less than pre-reminder time but more than 1 minute,
        // schedule a quick reminder with actual minutes remaining
        const minutesRemaining = Math.floor(millisUntilReminder / 60000)
        await new Promise(resolve => setTimeout(resolve, 50))
        const preId = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ Almost time: ${reminder.title}`,
            body: `${categoryEmoji} ${reminder.category} reminder in ${minutesRemaining} minutes`,
            data: { reminderId: reminder.id, type: "pre-reminder" },
            sound: true,
            badge: 1,
            color: isDarkMode ? categoryObj.darkColor : categoryObj.color,
          },
          trigger: { 
            date: new Date(now.getTime() + 5000)  // Show after 5 seconds
          },
        })
        result.preReminderId = preId
      }
      
      return result
    } catch (error) {
      console.error("Notification scheduling error:", error)
      return null
    }
  }, [parseReminderDate, isDarkMode])

  // Load reminders from storage
  useEffect(() => {
    const loadReminders = async () => {
      try {
        const savedReminders = await AsyncStorage.getItem("reminders")
        if (savedReminders) setReminders(JSON.parse(savedReminders))
      } catch (error) {
        console.error("Failed to load reminders:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadReminders()
    
    // Register for push notifications
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token)
    }).finally(() => {
      // Always set navigation bar position regardless of permission result
      setNavigationBarTheme(isDarkMode);
    });
    
    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Ensure navigation bar position when receiving a notification
      setNavigationBarTheme(isDarkMode);
    })
    
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Ensure navigation bar position when responding to a notification
      setNavigationBarTheme(isDarkMode);
      
      const reminderData = response.notification.request.content.data
      if (reminderData?.reminderId) {
        const reminder = reminders.find(r => r.id === reminderData.reminderId)
        if (reminder) editReminder(reminder)
      }
    })

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current)
      Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [])

  // Save reminders to storage
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem("reminders", JSON.stringify(reminders))
        .catch(error => console.error("Failed to save reminders:", error))
    }
  }, [reminders, isLoading])

  // Optimized notification management
  useEffect(() => {
    const updateNotifications = async () => {
      if (isLoading) return
      
      // Throttle updates (no more than once every 5 seconds)
      const now = Date.now()
      if (now - lastUpdateTimestamp.current < 5000) return
      lastUpdateTimestamp.current = now
      
      let hasChanges = false
      const updatedReminders = [...reminders]
      
      // Process in batches to reduce load
      for (let i = 0; i < updatedReminders.length; i++) {
        const reminder = updatedReminders[i]
        
        // Skip if recently processed
        if (reminder._lastProcessed && now - reminder._lastProcessed < 60000) continue
        
        const reminderDate = parseReminderDate(reminder.date)
        const isPastDue = reminderDate.getTime() <= (now + 30000)
        
        // Handle completed or past due reminders
        if (reminder.completed || isPastDue) {
          if (reminder.notificationId || reminder.preReminderId) {
            // Cancel notifications
            try {
              if (reminder.notificationId) {
                await Notifications.cancelScheduledNotificationAsync(reminder.notificationId)
              }
              if (reminder.preReminderId) {
                await Notifications.cancelScheduledNotificationAsync(reminder.preReminderId)
              }
            } catch (err) {}
            
            updatedReminders[i] = { 
              ...reminder, 
              notificationId: null,
              preReminderId: null,
              _lastProcessed: now
            }
            hasChanges = true
          }
          continue
        }
        
        // Check if notification needs scheduling
        const needsScheduling = 
          !reminder.notificationId || 
          !reminder._lastProcessed ||
          reminder._dateLastScheduled !== reminder.date
        
        if (needsScheduling) {
          try {
            await new Promise(resolve => setTimeout(resolve, 100))
            const notificationIds = await scheduleNotification(reminder)
            
            if (notificationIds) {
              updatedReminders[i] = { 
                ...reminder, 
                notificationId: notificationIds.mainId,
                preReminderId: notificationIds.preReminderId,
                _lastProcessed: now,
                _dateLastScheduled: reminder.date
              }
              hasChanges = true
            }
          } catch (error) {
            console.error("Notification scheduling failed:", error)
          }
        }
      }
      
      // Only update if needed
      if (hasChanges) setReminders(updatedReminders)
    }

    updateNotifications()
  }, [reminders, isLoading, scheduleNotification, parseReminderDate])

  // Toggle reminder completion
  const toggleComplete = async (id) => {
    setReminders(prevReminders => prevReminders.map(reminder => {
      if (reminder.id === id) {
        return { ...reminder, completed: !reminder.completed }
      }
      return reminder
    }))
  }

  // Delete reminder with confirmation
  const deleteReminder = async (id) => {
    if (swipeableRefs.current[id]) swipeableRefs.current[id].close()
    
    Alert.alert("Delete Reminder", "Are you sure you want to delete this reminder?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // Cancel notification if it exists
          const reminderToDelete = reminders.find(r => r.id === id)
          if (reminderToDelete) {
            if (reminderToDelete.notificationId) {
              await Notifications.cancelScheduledNotificationAsync(reminderToDelete.notificationId)
                .catch(() => {})
            }
            if (reminderToDelete.preReminderId) {
              await Notifications.cancelScheduledNotificationAsync(reminderToDelete.preReminderId)
                .catch(() => {})
            }
          }
          
          setReminders(prevReminders => prevReminders.filter(r => r.id !== id))
          delete swipeableRefs.current[id]
        },
      },
    ])
  }

  // Edit reminder
  const editReminder = (reminder) => {
    setCurrentReminder(reminder)
    setTitle(reminder.title)
    setSelectedDate(parseReminderDate(reminder.date))
    setPriority(reminder.priority)
    setCategory(reminder.category)
    setReminderTime(reminder.reminderTime || 15)
    setEditMode(true)
    setModalVisible(true)
    
    // Reset navigation bar when opening modal
    setNavigationBarTheme(isDarkMode);
  }

  // Open add modal with reset form
  const openAddReminderModal = () => {
    setCurrentReminder(null)
    setTitle("")
    setSelectedDate(new Date())
    setPriority("medium")
    setCategory("Work")
    setReminderTime(15)
    setEditMode(false)
    setModalVisible(true)
    
    // Reset navigation bar when opening modal
    setNavigationBarTheme(isDarkMode);
  }

  // Date picker helpers
  const showDatePickerModal = (mode) => {
    setDatePickerMode(mode)
    setShowDatePicker(true)
    
    // Reset navigation bar when showing date picker
    setNavigationBarTheme(isDarkMode);
  }

  const onChangeDate = (event, selected) => {
    if (selected) {
      const currentDateTime = new Date(selectedDate)
      
      if (datePickerMode === "date") {
        currentDateTime.setFullYear(selected.getFullYear())
        currentDateTime.setMonth(selected.getMonth())
        currentDateTime.setDate(selected.getDate())
      } else {
        currentDateTime.setHours(selected.getHours())
        currentDateTime.setMinutes(selected.getMinutes())
      }
      
      setSelectedDate(currentDateTime)
    }
    
    if (Platform.OS === "android") {
      setShowDatePicker(false)
      // Ensure navigation bar position after closing date picker on Android
      setNavigationBarTheme(isDarkMode);
    }
  }

  // Format date for display
  const formatDate = useCallback((date) => {
    return format(date, "yyyy-MM-dd h:mm a")
  }, [])

  // Save new/edited reminder
  const saveReminder = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a reminder title")
      return
    }
    
    const formattedDate = formatDate(selectedDate)
    const categoryObj = CATEGORIES.find(c => c.name === category) || CATEGORIES[0]
    const categoryColor = isDarkMode ? categoryObj.darkColor : categoryObj.color
    
    if (editMode && currentReminder) {
      // Update existing reminder
      setReminders(prevReminders => prevReminders.map(item => {
        if (item.id === currentReminder.id) {
          return {
            ...item,
            title,
            date: formattedDate,
            priority,
            category,
            reminderTime,
            color: categoryColor,
            notificationId: null, // Will be rescheduled
            preReminderId: null,
          }
        }
        return item
      }))
    } else {
      // Add new reminder
      const newReminder = {
        id: Date.now().toString(),
        title,
        date: formattedDate,
        priority,
        completed: false,
        category,
        reminderTime,
        color: categoryColor,
      }
      
      setReminders(prevReminders => [...prevReminders, newReminder])
    }
    
    setModalVisible(false)
    
    // Reset navigation bar position after closing modal
    setTimeout(setNavigationBarPosition, 300);
  }

  // Get priority colors based on theme
  const getPriorityColors = (priorityValue) => {
    const priorities = {
      low: { light: "#059669", dark: "#34D399" },
      medium: { light: "#D97706", dark: "#FBBF24" },
      high: { light: "#DC2626", dark: "#F87171" }
    };
    
    return isDarkMode ? priorities[priorityValue].dark : priorities[priorityValue].light;
  };

  // UI Component Renderers
  const renderPriorityButtons = () => {
    const priorities = ["low", "medium", "high"]
    
    return (
      <View style={styles.prioritySelector}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Priority:</Text>
        <View style={styles.priorityButtons}>
          {priorities.map(p => {
            const buttonColor = getPriorityColors(p);
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.priorityButton,
                  { 
                    backgroundColor: priority === p ? buttonColor : "transparent",
                    borderColor: buttonColor 
                  },
                ]}
                onPress={() => setPriority(p)}
              >
                <Text style={[
                  styles.priorityButtonText, 
                  { color: priority === p ? (isDarkMode ? "#000000" : "#ffffff") : buttonColor }
                ]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)} {PRIORITY_EMOJIS[p]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    )
  }

  const renderCategorySelection = () => (
    <View style={styles.categorySelector}>
      <Text style={[styles.formLabel, { color: colors.text }]}>Category:</Text>
      <View style={styles.categoryButtons}>
        {CATEGORIES.map(cat => {
          const catColor = isDarkMode ? cat.darkColor : cat.color;
          return (
            <TouchableOpacity
              key={cat.name}
              style={[
                styles.categoryButton,
                {
                  backgroundColor: category === cat.name ? `${catColor}20` : "transparent",
                  borderColor: catColor,
                  borderWidth: category === cat.name ? 2 : 1,
                },
              ]}
              onPress={() => setCategory(cat.name)}
            >
              <Ionicons name={cat.icon} size={16} color={catColor} style={styles.categoryIcon} />
              <Text style={[styles.categoryButtonText, { color: catColor }]}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  )

  const renderNotificationTimingSelector = () => {
    const timingOptions = [5, 15, 30, 60]
    
    return (
      <View style={styles.notificationTimingSelector}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Remind me before:</Text>
        <View style={styles.timingButtons}>
          {timingOptions.map(minutes => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.timingButton,
                {
                  backgroundColor: reminderTime === minutes ? `${colors.accent}20` : "transparent",
                  borderColor: colors.accent,
                  borderWidth: reminderTime === minutes ? 2 : 1,
                },
              ]}
              onPress={() => setReminderTime(minutes)}
            >
              <Text style={[
                styles.timingButtonText,
                { 
                  fontWeight: reminderTime === minutes ? "700" : "500",
                  color: colors.text
                },
              ]}>
                {minutes} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }

  const renderDateTimeButtons = () => (
    <View style={styles.formGroup}>
      <Text style={[styles.formLabel, { color: colors.text }]}>Date & Time</Text>
      <View style={styles.dateTimeButtons}>
        <TouchableOpacity 
          style={[styles.dateButton, { 
            backgroundColor: colors.accentLight, 
            borderColor: colors.accentBorder 
          }]} 
          onPress={() => showDatePickerModal("date")}
        >
          <Ionicons name="calendar-outline" size={20} color={colors.accent} />
          <Text style={[styles.dateButtonText, { color: colors.accent }]}>
            {format(selectedDate, "EEE, MMM d, yyyy")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.dateButton, { 
            backgroundColor: colors.accentLight, 
            borderColor: colors.accentBorder 
          }]} 
          onPress={() => showDatePickerModal("time")}
        >
          <Ionicons name="time-outline" size={20} color={colors.accent} />
          <Text style={[styles.dateButtonText, { color: colors.accent }]}>
            {format(selectedDate, "h:mm a")}
          </Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <View style={[styles.datePickerContainer, { backgroundColor: isDarkMode ? "#374151" : "#f8fafc" }]}>
          <DateTimePicker
            testID="dateTimePicker"
            value={selectedDate}
            mode={datePickerMode}
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onChangeDate}
            style={styles.datePicker}
            textColor={isDarkMode ? "#f9fafb" : undefined}
            themeVariant={isDarkMode ? "dark" : "light"}
          />
          {Platform.OS === "ios" && (
            <View style={[styles.datePickerButtons, { backgroundColor: isDarkMode ? "#1f2937" : "#f1f5f9" }]}>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => {
                  setShowDatePicker(false)
                  // Reset navigation bar after closing date picker
                  setNavigationBarPosition()
                }}
              >
                <Text style={[styles.datePickerButtonText, { color: colors.accent }]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  )
  const { isTabletLandscape, orientation } = useScreenDetails();
  // Main component render
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { 
          backgroundColor: colors.card,
        }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Reminders</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subText }]}>
            Stay on track with your tasks
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { 
            backgroundColor: colors.card,
            shadowColor: colors.shadow
          }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {reminders.filter(r => !r.completed).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Active</Text>
          </View>
          <View style={[styles.statCard, { 
            backgroundColor: colors.card,
            shadowColor: colors.shadow 
          }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {reminders.filter(r => r.completed).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>Completed</Text>
          </View>
          <View style={[styles.statCard, { 
            backgroundColor: colors.card,
            shadowColor: colors.shadow 
          }]}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {reminders.filter(r => r.priority === "high").length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.subText }]}>High Priority</Text>
          </View>
        </View>

        <FlatList
          data={reminders}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item, index }) => (
            <ReminderCard
              item={item}
              index={index}
              onToggleComplete={toggleComplete}
              onEdit={editReminder}
              onDelete={deleteReminder}
              swipeableRef={(ref, id) => {
                if (ref) swipeableRefs.current[id] = ref
              }}
              isDarkMode={isDarkMode}
            />
          )}
        />

        {/* Add Reminder Button */}
        <Pressable
          style={[styles.fab, { backgroundColor: colors.accent,           bottom: isTabletLandscape ? 20 : 90,
            right: isTabletLandscape ? 20 : 10 }]}
          onPress={openAddReminderModal}
          android_ripple={{ color: "#ffffff33", borderless: true, radius: 28 }}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </Pressable>

        {/* Add/Edit Reminder Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false)
            // Reset navigation bar when closing modal
            setTimeout(setNavigationBarPosition, 300)
          }}
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={[styles.modalOverlay, { backgroundColor: colors.modalBackground }]}>
              <View style={[styles.modalContent, { backgroundColor: colors.modalOverlay, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
                <View style={[styles.modalHeader, { 
                  borderBottomColor: colors.cardBorder 
                }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {editMode ? "Edit Reminder" : "New Reminder"}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color={colors.subText} />
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
                  <View style={styles.form}>
                    {/* Title Input */}
                    <View style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: colors.text }]}>Title</Text>
                      <TextInput
                        style={[styles.input, { 
                          backgroundColor: colors.input,
                          borderColor: colors.inputBorder,
                          color: colors.text
                        }]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Enter reminder title"
                        placeholderTextColor={colors.subText}
                        autoFocus={!editMode}
                      />
                    </View>

                    {renderDateTimeButtons()}
                    {renderNotificationTimingSelector()}
                    {renderPriorityButtons()}
                    {renderCategorySelection()}

                    {/* Save Button */}
                    <TouchableOpacity 
                      style={[styles.saveButton, { backgroundColor: colors.accent }]} 
                      onPress={saveReminder}
                    >
                      <Text style={styles.saveButtonText}>
                        {editMode ? "Update Reminder" : "Add Reminder"}
                      </Text>
                    </TouchableOpacity>

                    {/* Delete Button (edit mode only) */}
                    {editMode && (
                      <TouchableOpacity
                        style={[styles.deleteButton, {
                          borderColor: colors.deleteBorder,
                          backgroundColor: colors.deleteBackground
                        }]}
                        onPress={() => {
                          setModalVisible(false)
                          setTimeout(() => deleteReminder(currentReminder.id), 300)
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={colors.deleteText}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.deleteButtonText, { color: colors.text }]}>Delete Reminder</Text>

                      </TouchableOpacity>
                    )}

                    <View style={styles.bottomPadding} />
                  </View>
                </ScrollView>
              </View>
            </SafeAreaView>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </GestureHandlerRootView>
  )
}

// Register for push notifications
async function registerForPushNotificationsAsync() {
  let token

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4F46E5",
      sound: true,
    })
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Notification Permission Required",
        "Reminders need notifications to alert you at the scheduled time.",
        [{ text: "OK" }],
      )
      return
    }

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })
    ).data
  } else {
    Alert.alert("Physical Device Required", "Push Notifications require a physical device")
  }

  return token
}

const styles = StyleSheet.create({
  container: { 
    flex: 1
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 0.3,
    paddingRight:20,
    borderBlockColor: 'lightgrey',
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: "700", 
    marginBottom: 4 
  },
  headerSubtitle: { 
    fontSize: 15, 
    fontWeight: "500" 
  },
  statsContainer: { 
    flexDirection: "row", 
    padding: 16, 
    gap: 12 
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    ...Platform.select({
      ios: { 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.2, 
        shadowRadius: 6 
      },
      android: { 
        elevation: 3 
      },
    }),
  },
  statNumber: { 
    fontSize: 24, 
    fontWeight: "700", 
    marginBottom: 4 
  },
  statLabel: { 
    fontSize: 13, 
    fontWeight: "500" 
  },
  listContainer: { 
    padding: 16, 
    paddingBottom: 100 
  },
  fab: {
    position: "absolute",
    // bottom: 100,
    // right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: { 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 3 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 6 
      },
      android: { 
        elevation: 6 
      },
    }),
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: "flex-end" 
  },
  modalContent: { 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    maxHeight: "85%" 
  },
  modalHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: 20, 
    borderBottomWidth: 1 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: "700" 
  },
  closeButton: { 
    padding: 4,
    borderRadius: 20
  },
  form: { 
    padding: 25 
  },
  formGroup: { 
    marginBottom: 20 
  },
  formLabel: { 
    fontSize: 14, 
    fontWeight: "600", 
    marginBottom: 8 
  },
  input: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 15, 
    fontSize: 16 
  },
  formScrollView: {
    paddingBottom: 20
  },
  dateTimeButtons: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    gap: 12 
  },
  dateButton: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    borderRadius: 12, 
    padding: 12, 
    borderWidth: 1 
  },
  dateButtonText: { 
    marginLeft: 8, 
    fontSize: 14, 
    fontWeight: "500" 
  },
  datePickerContainer: { 
    marginTop: 12, 
    borderRadius: 12, 
    overflow: "hidden" 
  },
  datePicker: {
    height: 160
  },
  datePickerButtons: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    padding: 8 
  },
  datePickerButton: { 
    padding: 8,
    borderRadius: 8 
  },
  datePickerButtonText: { 
    fontWeight: "600" 
  },
  prioritySelector: {
    marginBottom: 20
  },
  priorityButtons: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    gap: 8 
  },
  priorityButton: { 
    flex: 1, 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 12, 
    alignItems: "center" 
  },
  priorityButtonText: { 
    fontWeight: "600", 
    fontSize: 14 
  },
  categorySelector: {
    marginBottom: 20
  },
  categoryButtons: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 8 
  },
  categoryButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    borderRadius: 12, 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    marginBottom: 8, 
    borderWidth: 1 
  },
  categoryIcon: { 
    marginRight: 6 
  },
  categoryButtonText: { 
    fontWeight: "600", 
    fontSize: 14 
  },
  notificationTimingSelector: { 
    marginBottom: 20 
  },
  timingButtons: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    gap: 8 
  },
  timingButton: { 
    flex: 1, 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 10, 
    alignItems: "center" 
  },
  timingButtonText: { 
    fontSize: 14,
    fontWeight: "500"
  },
  saveButton: { 
    borderRadius: 12, 
    padding: 16, 
    alignItems: "center", 
    marginVertical: 16 
  },
  saveButtonText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 16 
  },
  deleteButton: { 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center", 
    padding: 16, 
    borderWidth: 1, 
    borderRadius: 12
  },
  deleteButtonText: { 
    fontWeight: "600", 
    fontSize: 15 
  },
  bottomPadding: { 
    height: 40 
  },
  deleteAction: { 
    width: 80, 
    height: "100%", 
    marginLeft: 12 
  },
  deleteActionContent: { 
    flex: 1, 
    marginVertical: 4, 
    borderRadius: 14, 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 1
  },
  deleteActionText: { 
    fontSize: 12, 
    fontWeight: "600", 
    marginTop: 4 
  },
});
