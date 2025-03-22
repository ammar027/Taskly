import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import {Platform} from 'react-native'

// Notification service class for handling all notification operations
export class NotificationService {
  constructor(realm, userId) {
    this.realm = realm
    this.userId = userId
    this.hasPermission = false
    this.expoPushToken = null

    // Initialize notifications
    this.initialize()
  }

  // Set up notification handlers and permissions
  async initialize() {
    // Skip for web platform (handled separately)
    if (Platform.OS === 'web') {
      await this.initializeWebNotifications()
      return
    }

    // Set notification handler for foreground notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true
      })
    })

    // Check if device is physical (not simulator/emulator)
    const isDevice = Device.isDevice

    if (!isDevice) {
      console.log('Must use physical device for Push Notifications')
      return
    }

    // Request permission
    const {status: existingStatus} = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const {status} = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!')
      return
    }

    this.hasPermission = true

    // Get Expo push token
    try {
      const token = await this.registerForPushNotificationsAsync()
      this.expoPushToken = token
      console.log('Expo push token:', token)

      // Save token to your backend (if needed)
      // await this.saveTokenToBackend(token);
    } catch (error) {
      console.error('Error getting push token:', error)
    }

    // Add notification listeners
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification)
    })

    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response)
      // Handle notification tap/action
      this.handleNotificationResponse(response)
    })
  }

  // Initialize web notifications
  async initializeWebNotifications() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      this.hasPermission = permission === 'granted'
    }

    if (this.hasPermission) {
      console.log('Web notification permission granted')
      // Initialize service worker for background notifications (if needed)
      this.registerServiceWorker()
    }
  }

  // Register service worker for web
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js')
        console.log('Service Worker registered with scope:', registration.scope)
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  // Register for push notifications
  async registerForPushNotificationsAsync() {
    let token

    if (Platform.OS === 'web') {
      // Web push implementation would go here
      return null
    }

    if (Device.isDevice) {
      const {status: existingStatus} = await Notifications.getPermissionsAsync()
      let finalStatus = existingStatus

      if (existingStatus !== 'granted') {
        const {status} = await Notifications.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        return null
      }

      // Get the token
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId
        })
      ).data
    }

    return token
  }

  // Clean up listeners
  cleanup() {
    if (Platform.OS !== 'web') {
      if (this.notificationListener) {
        Notifications.removeNotificationSubscription(this.notificationListener)
      }
      if (this.responseListener) {
        Notifications.removeNotificationSubscription(this.responseListener)
      }
    }
  }

  // Schedule a notification for a reminder
  async scheduleReminderNotification(noteId, title, content, reminderString) {
    if (!this.hasPermission) {
      console.log('No notification permission')
      return false
    }

    let trigger

    try {
      // Parse the reminder string and get the trigger time
      const triggerDate = this.parseReminderToDate(reminderString)

      if (!triggerDate) {
        console.error('Invalid reminder format:', reminderString)
        return false
      }

      // Check if the date is in the past
      if (triggerDate < new Date()) {
        console.log('Cannot schedule notification for past time')
        return false
      }

      if (Platform.OS === 'web') {
        return this.scheduleWebNotification(noteId, title, content, triggerDate)
      }

      // Create notification trigger
      trigger = {
        date: triggerDate
      }

      // Identifier for the notification (to be able to cancel it later)
      const identifier = `reminder-${noteId}`

      // Cancel any existing notification with the same ID
      await this.cancelNotification(identifier)

      // Schedule the new notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder: ' + title,
          body: content || 'Your reminder is due',
          data: {noteId, type: 'reminder'},
          sound: true
        },
        trigger,
        identifier
      })

      console.log('Scheduled notification:', notificationId)
      return notificationId
    } catch (error) {
      console.error('Error scheduling notification:', error)
      return false
    }
  }

  // Schedule a notification for a due date
  async scheduleDueDateNotification(noteId, title, content, dueDateString) {
    if (!this.hasPermission) {
      console.log('No notification permission')
      return false
    }

    try {
      // Parse the due date string (YYYY-MM-DD) to a Date object
      const dueDate = new Date(dueDateString)

      if (isNaN(dueDate.getTime())) {
        console.error('Invalid due date format:', dueDateString)
        return false
      }

      // Set notification time to 9:00 AM on the due date
      dueDate.setHours(9, 0, 0, 0)

      // Check if the date is in the past
      if (dueDate < new Date()) {
        console.log('Cannot schedule notification for past due date')
        return false
      }

      if (Platform.OS === 'web') {
        return this.scheduleWebNotification(noteId, title, content, dueDate, 'due')
      }

      // Identifier for the notification
      const identifier = `duedate-${noteId}`

      // Cancel any existing notification with the same ID
      await this.cancelNotification(identifier)

      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Due Today: ' + title,
          body: content || 'Your task is due today',
          data: {noteId, type: 'dueDate'},
          sound: true
        },
        trigger: {
          date: dueDate
        },
        identifier
      })

      console.log('Scheduled due date notification:', notificationId)
      return notificationId
    } catch (error) {
      console.error('Error scheduling due date notification:', error)
      return false
    }
  }

  // Schedule web notification (uses local storage to persist)
  scheduleWebNotification(noteId, title, content, triggerDate, type = 'reminder') {
    if (!this.hasPermission) return false

    const now = new Date()
    const timeDiff = triggerDate.getTime() - now.getTime()

    if (timeDiff <= 0) return false

    // Store notification data in localStorage to persist through page reloads
    const storageKey = `notification-${type}-${noteId}`
    const notificationData = {
      id: storageKey,
      title: type === 'reminder' ? 'Reminder: ' + title : 'Due Today: ' + title,
      body: content || (type === 'reminder' ? 'Your reminder is due' : 'Your task is due today'),
      triggerTime: triggerDate.getTime(),
      noteId,
      type
    }

    localStorage.setItem(storageKey, JSON.stringify(notificationData))

    // Set timeout for this page session
    const timeoutId = setTimeout(() => {
      this.showWebNotification(notificationData)
    }, timeDiff)

    // Store timeout ID to be able to cancel it
    localStorage.setItem(`${storageKey}-timeoutId`, timeoutId.toString())

    // On page load, we should check for pending notifications and reschedule them
    // (This happens in a separate function that should be called when the app initializes)

    return storageKey
  }

  // Show a web notification
  showWebNotification(notificationData) {
    if (!this.hasPermission) return

    const notification = new Notification(notificationData.title, {
      body: notificationData.body,
      icon: '/icon.png' // Path to your app icon
    })

    notification.onclick = () => {
      // Handle notification click - open the note
      window.focus()
      // Navigate to the note
      if (window.router) {
        window.router.push({
          pathname: '/record/[id]',
          params: {id: notificationData.noteId}
        })
      }
    }

    // Clean up the notification data from storage
    localStorage.removeItem(notificationData.id)
    localStorage.removeItem(`${notificationData.id}-timeoutId`)
  }

  // Reschedule pending web notifications on page load
  rescheduleWebNotifications() {
    if (Platform.OS !== 'web' || !this.hasPermission) return

    // Check local storage for pending notifications
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('notification-')) {
        try {
          const notificationData = JSON.parse(localStorage.getItem(key))
          const now = new Date()
          const triggerTime = notificationData.triggerTime
          const timeDiff = triggerTime - now.getTime()

          // Only reschedule if it's still in the future
          if (timeDiff > 0) {
            setTimeout(() => {
              this.showWebNotification(notificationData)
            }, timeDiff)
          } else {
            // Clean up expired notifications
            localStorage.removeItem(key)
            localStorage.removeItem(`${key}-timeoutId`)
          }
        } catch (e) {
          console.error('Error rescheduling web notification:', e)
        }
      }
    }
  }

  // Cancel a notification
  async cancelNotification(identifier) {
    try {
      if (Platform.OS === 'web') {
        // Cancel web notification
        const timeoutId = localStorage.getItem(`${identifier}-timeoutId`)
        if (timeoutId) {
          clearTimeout(parseInt(timeoutId))
          localStorage.removeItem(identifier)
          localStorage.removeItem(`${identifier}-timeoutId`)
        }
        return true
      } else {
        // Cancel native notification
        await Notifications.cancelScheduledNotificationAsync(identifier)
        return true
      }
    } catch (error) {
      console.error('Error canceling notification:', error)
      return false
    }
  }

  // Cancel all notifications for a note
  async cancelNoteNotifications(noteId) {
    await this.cancelNotification(`reminder-${noteId}`)
    await this.cancelNotification(`duedate-${noteId}`)
  }

  // Handle notification response (when user taps on notification)
  handleNotificationResponse(response) {
    const {noteId} = response.notification.request.content.data

    if (noteId) {
      // Navigate to the note detail screen
      if (router) {
        router.push({
          pathname: '/record/[id]',
          params: {id: noteId}
        })
      }
    }
  }

  // Parse reminder string to Date object
  parseReminderToDate(reminderString) {
    if (!reminderString) return null

    const now = new Date()

    // Handle "in X minutes" format
    if (reminderString.startsWith('in ')) {
      const minutesMatch = reminderString.match(/in (\d+) minutes/)
      if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1])
        const reminderDate = new Date(now.getTime() + minutes * 60000)
        return reminderDate
      }
    }
    // Handle "at HH:MMam/pm" format
    else if (reminderString.startsWith('at ')) {
      // Try AM/PM format first
      const amPmTimeMatch = reminderString.match(/at (\d+):?(\d+)?([ap]m)/i)
      if (amPmTimeMatch) {
        let hours = parseInt(amPmTimeMatch[1])
        const minutes = amPmTimeMatch[2] ? parseInt(amPmTimeMatch[2]) : 0
        const isPm = amPmTimeMatch[3].toLowerCase() === 'pm'

        // Convert to 24-hour format
        if (isPm && hours < 12) hours += 12
        if (!isPm && hours === 12) hours = 0

        const reminderDate = new Date(now)
        reminderDate.setHours(hours, minutes, 0, 0)

        // If the time is in the past, set it for tomorrow
        if (reminderDate < now) {
          reminderDate.setDate(reminderDate.getDate() + 1)
        }

        return reminderDate
      }

      // Try 24-hour format
      const timeMatch = reminderString.match(/at (\d{2}):(\d{2})/)
      if (timeMatch) {
        const hours = parseInt(timeMatch[1])
        const minutes = parseInt(timeMatch[2])

        const reminderDate = new Date(now)
        reminderDate.setHours(hours, minutes, 0, 0)

        // If the time is in the past, set it for tomorrow
        if (reminderDate < now) {
          reminderDate.setDate(reminderDate.getDate() + 1)
        }

        return reminderDate
      }
    }
    // Handle "on YYYY-MM-DD" format
    else if (reminderString.startsWith('on ')) {
      const dateMatch = reminderString.match(/on (\d{4}-\d{2}-\d{2})/)
      if (dateMatch) {
        const dateStr = dateMatch[1]
        const reminderDate = new Date(dateStr)

        // Set time to 9:00 AM
        reminderDate.setHours(9, 0, 0, 0)

        return reminderDate
      }
    }

    return null
  }
}
