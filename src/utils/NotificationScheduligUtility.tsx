import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuration for notification channel on Android
const configureNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default Channel',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
};

// Utility to parse the specific time format
const parseTimeString = (timeString) => {
  try {
    // Expected format: 'at 15:49 on 2025-03-25'
    const timeRegex = /at (\d{2}):(\d{2}) on (\d{4})-(\d{2})-(\d{2})/;
    const match = timeString.match(timeRegex);
    
    if (!match) {
      throw new Error('Invalid time format');
    }
    
    const [, hours, minutes, year, month, day] = match;
    return new Date(
      parseInt(year), 
      parseInt(month) - 1,  // Months are 0-indexed in JS Date
      parseInt(day), 
      parseInt(hours), 
      parseInt(minutes)
    );
  } catch (error) {
    console.error('Error parsing time string:', error);
    return null;
  }
};

// Main notification scheduling function
const scheduleNotification = async (timeString, notificationDetails = {}) => {
  // Ensure notification channel is configured
  await configureNotificationChannel();

  // Parse the time string
  const scheduledDate = parseTimeString(timeString);
  
  if (!scheduledDate) {
    throw new Error('Invalid time format');
  }

  // Default notification content if not provided
  const defaultContent = {
    title: 'Reminder',
    body: 'You have a scheduled notification',
    sound: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  };

  // Merge default and provided notification details
  const content = { ...defaultContent, ...notificationDetails };

  try {
    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        date: scheduledDate,
        repeats: false  // One-time notification
      }
    });

    return {
      success: true,
      notificationId,
      scheduledFor: scheduledDate
    };
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Function to cancel a specific notification
const cancelNotification = async (notificationId) => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return { success: true };
  } catch (error) {
    console.error('Failed to cancel notification:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Request notification permissions
const requestNotificationPermissions = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
};

export {
  scheduleNotification,
  cancelNotification,
  requestNotificationPermissions,
  parseTimeString
};