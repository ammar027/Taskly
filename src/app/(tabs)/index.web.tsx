/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
import {View, Text, StyleSheet, FlatList, Pressable, Platform, Linking, Alert, RefreshControl, Dimensions, Modal} from 'react-native'
import {Ionicons} from '@expo/vector-icons'
import Animated, {FadeInUp, FadeOutDown} from 'react-native-reanimated'
import {memo, useCallback, useContext, useEffect, useRef, useState} from 'react'
import {StatusBar} from 'expo-status-bar'
import {router, useLocalSearchParams} from 'expo-router'
import {ActivityIndicator} from 'react-native'
import CategorySelectionModalWeb from '@/components/Modals/CategorySelectionModalWeb'
import CustomAlert from '@/components/Modals/CutomAlert'
import {useTheme} from '@/components/ThemeContext'
import {useScreenDetails} from '@/components/OrientationControl'
import {ResponsiveHeader} from '@/components/ResponsiveHeader.web'
import {useRealm} from '@/components/RealmContext'
import {AuthContext, useAuth} from '@/components/AuthContext'
import NoteService from '@/services/NoteService'
import DeletedNotesModal from '@/components/Modals/DeletedNotes.web'
import CreateNoteModal from '@/components/Modals/CreateNoteModal'
import DateTimePicker from '@react-native-community/datetimepicker'
import {TextInput} from 'react-native-gesture-handler'
import {createNoteService} from '@/services/NoteServiceFactory'
import {supabase} from '@/lib/supabase'
import SyncServiceWeb from '@/services/SyncServiceWeb'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// Updated NoteCard component with editable reminders and due dates
const NoteCard = memo(({item, index, onDelete, onUpdateCategory, onToggleCompletion, onUpdateDueDate, onUpdateReminder, onUpdatePriority, theme, isLandscape}) => {
  const [categoryModalVisible, setCategoryModalVisible] = useState(false)
  const [alertVisible, setAlertVisible] = useState(false)
  const [datePickerVisible, setDatePickerVisible] = useState(false)
  const [reminderPickerVisible, setReminderPickerVisible] = useState(false)
  const [priorityModalVisible, setPriorityModalVisible] = useState(false)

  const handlePress = useCallback(() => {
    console.log('Navigating to note with ID:', item.id)
    router.push({
      pathname: '/record/[id]',
      params: {id: item.id}
    })
  }, [item.id])

  const handleCategorySelect = useCallback(() => {
    setCategoryModalVisible(true)
  }, [])

  const handleUpdateCategory = useCallback(
    category => {
      if (onUpdateCategory) {
        onUpdateCategory(item.id, category)
      }
    },
    [item.id, onUpdateCategory]
  )
  const handleToggleCompletion = useCallback(() => {
    if (onToggleCompletion) {
      onToggleCompletion(item.id, !item.isCompleted)
    }
  }, [item.id, item.isCompleted, onToggleCompletion])

  const handleDueDatePress = useCallback(() => {
    setDatePickerVisible(true)
  }, [])

  const handleReminderPress = useCallback(() => {
    setReminderPickerVisible(true)
  }, [])

  const handlePriorityPress = useCallback(() => {
    setPriorityModalVisible(true)
  }, [])

  const handleUpdatePriority = useCallback(
    priority => {
      if (onUpdatePriority) {
        onUpdatePriority(item.id, priority)
      }
      setPriorityModalVisible(false)
    },
    [item.id, onUpdatePriority]
  )

  const handleUpdateDueDate = useCallback(
    date => {
      if (onUpdateDueDate) {
        onUpdateDueDate(item.id, date)
      }
      setDatePickerVisible(false)
    },
    [item.id, onUpdateDueDate]
  )

  const handleUpdateReminder = useCallback(
    reminder => {
      if (onUpdateReminder) {
        onUpdateReminder(item.id, reminder)
      }
      setReminderPickerVisible(false)
    },
    [item.id, onUpdateReminder]
  )

  return (
    <>
      <AnimatedPressable
        onPress={handlePress}
        style={[
          styles.noteCard,
          {
            backgroundColor: `${item.color}${theme.isDarkMode ? '20' : '10'}`,
            borderColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            width: isLandscape ? '48%' : '100%'
          }
        ]}
        entering={FadeInUp.delay(index * 100)}
        exiting={FadeOutDown}
      >
        {/* Wrap the content in a regular View with opacity */}
        <View style={{opacity: item.isCompleted ? 0.6 : 1.2}}>
          <View style={styles.noteHeader}>
            <View style={styles.titleContainer}>
              <Pressable style={styles.checkboxContainer} onPress={handleToggleCompletion} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: item.color,
                      backgroundColor: item.isCompleted ? item.color : 'transparent'
                    }
                  ]}
                >
                  {item.isCompleted && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </Pressable>
              <Text
                style={[
                  styles.noteTitle,
                  {
                    color: theme.textColor,
                    textDecorationLine: item.isCompleted ? 'line-through' : 'none'
                  }
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </View>
            <Text
              style={[
                styles.noteCategory,
                {
                  backgroundColor: `${item.color}${theme.isDarkMode ? '30' : '20'}`,
                  color: item.color
                }
              ]}
              onPress={handleCategorySelect}
            >
              {item.category}
            </Text>
          </View>
          <Text
            style={[
              styles.noteContent,
              {
                color: theme.subTextColor,
                textDecorationLine: item.isCompleted ? 'line-through' : 'none'
              }
            ]}
            numberOfLines={2}
          >
            {item.content}
          </Text>
          <View style={styles.noteFooter}>
            <View style={styles.dateAndMetaContainer}>
              {/* <Text style={[styles.noteDate, {color: theme.mutedTextColor}]}>
              <Ionicons name="cloud-done-outline" size={14} /> {new Date(item.updatedAt).toLocaleDateString()}
            </Text> */}

              <View style={styles.metaItemsRow}>
                {item.dueDate ? (
                  <Pressable style={styles.metaItem} onPress={handleDueDatePress}>
                    <Ionicons name="calendar" size={14} color={theme.isDarkMode ? '#a0a0a0' : '#64748b'} />
                    <Text style={[styles.metaText, {color: theme.textColor}]}>{new Date(item.dueDate).toLocaleDateString()}</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.addMetaItem} onPress={handleDueDatePress}>
                    <Ionicons name="add-circle-outline" size={12} color={theme.mutedTextColor} />
                    <Text style={[styles.addMetaText, {color: theme.mutedTextColor}]}>Due</Text>
                  </Pressable>
                )}

                {item.reminder ? (
                  <Pressable style={styles.metaItem} onPress={handleReminderPress}>
                    <Ionicons name="notifications" size={14} color={theme.isDarkMode ? '#a0a0a0' : '#64748b'} />
                    <Text style={[styles.metaText, {color: theme.textColor}]}>{item.reminder.startsWith('at ') ? item.reminder.slice(3) : item.reminder.startsWith('on ') ? item.reminder.slice(3) : item.reminder}</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.addMetaItem} onPress={handleReminderPress}>
                    <Ionicons name="add-circle-outline" size={12} color={theme.mutedTextColor} />
                    <Text style={[styles.addMetaText, {color: theme.mutedTextColor}]}>Reminder</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.rightFooterSection}>
              {/* Simplified Priority indicator - just showing first letter */}
              {item.priority && (
                <Pressable style={styles.priorityPill} onPress={handlePriorityPress}>
                  <Text style={[styles.priorityText, {color: item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#f59e0b' : '#10b981'}]}>{item.priority.charAt(0).toUpperCase()}</Text>
                </Pressable>
              )}

              {/* Action icons */}
              <View style={styles.actionIcons}>
                <Pressable style={styles.iconButton} onPress={handleCategorySelect}>
                  <Ionicons name="folder-outline" size={18} color={theme.isDarkMode ? '#9ca3af' : '#6B7280'} />
                </Pressable>
                <Pressable style={styles.iconButton} onPress={() => setAlertVisible(true)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </AnimatedPressable>

      <CategorySelectionModalWeb visible={categoryModalVisible} onClose={() => setCategoryModalVisible(false)} onSelectCategory={handleUpdateCategory} currentCategory={item.category} theme={theme} />
      <DatePickerModal visible={datePickerVisible} onClose={() => setDatePickerVisible(false)} onSelectDate={handleUpdateDueDate} currentDate={item.dueDate} theme={theme} />
      <ReminderPickerModal visible={reminderPickerVisible} onClose={() => setReminderPickerVisible(false)} onSelectReminder={handleUpdateReminder} currentReminder={item.reminder} theme={theme} />
      <PrioritySelectionModal visible={priorityModalVisible} onClose={() => setPriorityModalVisible(false)} onSelectPriority={handleUpdatePriority} currentPriority={item.priority} theme={theme} />
      <CustomAlert
        visible={alertVisible}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        onCancel={() => setAlertVisible(false)}
        onDelete={() => {
          onDelete(item.id)
          setAlertVisible(false)
        }}
        theme={theme}
      />
    </>
  )
})

const DatePickerModal = ({visible, onClose, onSelectDate, currentDate, theme}) => {
  // Initialize with current date if provided, otherwise use today
  // Parse the currentDate if it's in ISO format
  const [selectedDate, setSelectedDate] = useState(currentDate ? new Date(currentDate) : new Date())
  const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios')

  const handleConfirm = () => {
    // Format date as YYYY-MM-DD to match processDateString output
    const formattedDate = selectedDate.toISOString().split('T')[0]
    onSelectDate(formattedDate)
    onClose()
  }

  const handleClear = () => {
    onSelectDate(null)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent={true}>
      <View style={[styles.modalOverlay, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
        <View style={[styles.modalContent, {backgroundColor: theme.cardBackground}]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, {color: theme.textColor}]}>Select Due Date</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textColor} />
            </Pressable>
          </View>

          <View style={styles.datePickerContainer}>
            {/* Date picker - handle platform differences */}
            {Platform.OS === 'ios' ? (
              // iOS date picker is always visible
              <DateTimePicker value={selectedDate} mode="date" display="spinner" onChange={(event, date) => setSelectedDate(date || selectedDate)} style={{width: '100%'}} textColor={theme.textColor} />
            ) : (
              // Android needs button to show DateTimePicker
              <>
                <Pressable style={[styles.dateDisplay, {borderColor: theme.borderColor}]} onPress={() => setShowDatePicker(true)}>
                  <Text style={{color: theme.textColor}}>{selectedDate.toLocaleDateString()}</Text>
                  <Ionicons name="calendar" size={20} color={theme.textColor} />
                </Pressable>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(false)
                      if (date) setSelectedDate(date)
                    }}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.modalActions}>
            <Pressable style={[styles.modalButton, styles.clearButton]} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
            <Pressable style={[styles.modalButton, styles.confirmButton, {backgroundColor: '#4F46E5'}]} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// Add this utility function to better detect screen sizes for web
const useScreenSizeDetection = () => {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web') return

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)

    // Clean up
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Determine grid columns based on screen width
  const getGridColumns = () => {
    if (windowSize.width >= 1200) return 4
    if (windowSize.width >= 768) return 2
    return 1
  }

  return {
    windowSize,
    isSmallScreen: windowSize.width < 768,
    isMediumScreen: windowSize.width >= 768 && windowSize.width < 1200,
    isLargeScreen: windowSize.width >= 1200,
    gridColumns: getGridColumns()
  }
}

// PrioritySelectionModal - Aligned with findClosestPriority function
const PrioritySelectionModal = ({visible, onClose, onSelectPriority, currentPriority, theme}) => {
  // These match the priorities expected by findClosestPriority
  const priorities = [
    {value: 'high', label: 'High', color: '#ef4444'},
    {value: 'medium', label: 'Medium', color: '#f59e0b'},
    {value: 'low', label: 'Low', color: '#10b981'}
  ]

  const handleSelect = priority => {
    onSelectPriority(priority)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent={true}>
      <View style={[styles.modalOverlay, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
        <View style={[styles.modalContent, {backgroundColor: theme.cardBackground}]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, {color: theme.textColor}]}>Select Priority</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textColor} />
            </Pressable>
          </View>

          <View style={styles.priorityOptions}>
            {priorities.map(priority => (
              <Pressable
                key={priority.value}
                style={[
                  styles.priorityOption,
                  {
                    backgroundColor: currentPriority === priority.value ? `${priority.color}20` : 'transparent',
                    borderColor: theme.borderColor
                  }
                ]}
                onPress={() => handleSelect(priority.value)}
              >
                <View style={[styles.priorityDot, {backgroundColor: priority.color}]} />
                <Text style={{color: theme.textColor}}>{priority.label}</Text>
                {currentPriority === priority.value && <Ionicons name="checkmark" size={18} color={priority.color} style={{marginLeft: 'auto'}} />}
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ReminderPickerModal - Updated to align with processReminderString
const ReminderPickerModal = ({visible, onClose, onSelectReminder, currentReminder, theme}) => {
  const [selectedOption, setSelectedOption] = useState('time')
  const [selectedTime, setSelectedTime] = useState(new Date())
  const [selectedMinutes, setSelectedMinutes] = useState(30)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios')
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Parse currentReminder to set initial state
  useEffect(() => {
    if (visible && currentReminder) {
      // Parse the current reminder to set the initial values
      if (currentReminder.startsWith('in ')) {
        const minutesMatch = currentReminder.match(/in (\d+) minutes/)
        if (minutesMatch) {
          setSelectedOption('minutes')
          setSelectedMinutes(parseInt(minutesMatch[1]))
        }
      } else if (currentReminder.startsWith('at ')) {
        // Check for AM/PM format (e.g., "at 3:30pm")
        const amPmTimeMatch = currentReminder.match(/at (\d+):?(\d+)?([ap]m)/i)
        if (amPmTimeMatch) {
          setSelectedOption('time')
          let hours = parseInt(amPmTimeMatch[1])
          const minutes = amPmTimeMatch[2] ? parseInt(amPmTimeMatch[2]) : 0
          const isPm = amPmTimeMatch[3].toLowerCase() === 'pm'

          // Convert to 24-hour format for the date object
          if (isPm && hours < 12) hours += 12
          if (!isPm && hours === 12) hours = 0

          const date = new Date()
          date.setHours(hours, minutes, 0, 0)
          setSelectedTime(date)
        }
        // Also keep support for 24-hour format in case it comes from somewhere else
        else {
          const timeMatch = currentReminder.match(/at (\d{2}):(\d{2})/)
          if (timeMatch) {
            setSelectedOption('time')
            const hours = parseInt(timeMatch[1])
            const minutes = parseInt(timeMatch[2])
            const date = new Date()
            date.setHours(hours, minutes, 0, 0)
            setSelectedTime(date)
          }
        }
      } else if (currentReminder.startsWith('on ')) {
        const dateMatch = currentReminder.match(/on (\d{4}-\d{2}-\d{2})/)
        if (dateMatch) {
          setSelectedOption('date')
          setSelectedDate(new Date(dateMatch[1]))
        }
      }
    }
  }, [visible, currentReminder])

  const handleConfirm = () => {
    let reminder
    if (selectedOption === 'minutes') {
      reminder = `in ${selectedMinutes} minutes`
    } else if (selectedOption === 'time') {
      // Convert 24-hour format to AM/PM format for compatibility with processReminderString
      const hours24 = selectedTime.getHours()
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0')
      const hours12 = hours24 % 12 || 12 // Convert 0 to 12 for 12 AM
      const ampm = hours24 >= 12 ? 'pm' : 'am'

      // Format as "at 3:30pm" instead of "at 15:30"
      reminder = `at ${hours12}:${minutes}${ampm}`
    } else if (selectedOption === 'date') {
      const year = selectedDate.getFullYear()
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0')
      const day = selectedDate.getDate().toString().padStart(2, '0')
      reminder = `on ${year}-${month}-${day}`
    }

    onSelectReminder(reminder)
    onClose()
  }

  const handleClear = () => {
    onSelectReminder(null)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent={true}>
      <View style={[styles.modalOverlay, {backgroundColor: 'rgba(0,0,0,0.5)'}]}>
        <View style={[styles.modalContent, {backgroundColor: theme.cardBackground}]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, {color: theme.textColor}]}>Set Reminder</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textColor} />
            </Pressable>
          </View>

          <View style={styles.reminderOptions}>
            <Pressable style={[styles.reminderOption, selectedOption === 'minutes' && styles.selectedOption, {borderColor: theme.borderColor}]} onPress={() => setSelectedOption('minutes')}>
              <Text style={{color: theme.textColor}}>In Minutes</Text>
            </Pressable>
            <Pressable style={[styles.reminderOption, selectedOption === 'time' && styles.selectedOption, {borderColor: theme.borderColor}]} onPress={() => setSelectedOption('time')}>
              <Text style={{color: theme.textColor}}>At Time</Text>
            </Pressable>
            <Pressable style={[styles.reminderOption, selectedOption === 'date' && styles.selectedOption, {borderColor: theme.borderColor}]} onPress={() => setSelectedOption('date')}>
              <Text style={{color: theme.textColor}}>On Date</Text>
            </Pressable>
          </View>

          {selectedOption === 'minutes' && (
            <View style={styles.minutesContainer}>
              <TextInput
                style={[styles.minutesInput, {color: theme.textColor, borderColor: theme.borderColor}]}
                value={selectedMinutes.toString()}
                onChangeText={text => {
                  const num = parseInt(text)
                  if (!isNaN(num) && num > 0) {
                    setSelectedMinutes(num)
                  }
                }}
                keyboardType="number-pad"
                placeholder="Minutes"
                placeholderTextColor={theme.mutedTextColor}
              />
              <Text style={{color: theme.textColor}}>minutes</Text>
            </View>
          )}

          {selectedOption === 'time' && (
            <View style={styles.timePickerContainer}>
              {Platform.OS === 'ios' ? (
                <DateTimePicker value={selectedTime} mode="time" display="spinner" onChange={(event, time) => setSelectedTime(time || selectedTime)} style={{width: '100%'}} textColor={theme.textColor} />
              ) : (
                <>
                  <Pressable style={[styles.timeDisplay, {borderColor: theme.borderColor}]} onPress={() => setShowTimePicker(true)}>
                    <Text style={{color: theme.textColor}}>{selectedTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</Text>
                    <Ionicons name="time" size={20} color={theme.textColor} />
                  </Pressable>

                  {showTimePicker && (
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display="default"
                      onChange={(event, time) => {
                        setShowTimePicker(false)
                        if (time) setSelectedTime(time)
                      }}
                    />
                  )}
                </>
              )}
            </View>
          )}

          {selectedOption === 'date' && (
            <View style={styles.datePickerContainer}>
              {Platform.OS === 'ios' ? (
                <DateTimePicker value={selectedDate} mode="date" display="spinner" onChange={(event, date) => setSelectedDate(date || selectedDate)} style={{width: '100%'}} textColor={theme.textColor} />
              ) : (
                <>
                  <Pressable style={[styles.dateDisplay, {borderColor: theme.borderColor}]} onPress={() => setShowDatePicker(true)}>
                    <Text style={{color: theme.textColor}}>{selectedDate.toLocaleDateString()}</Text>
                    <Ionicons name="calendar" size={20} color={theme.textColor} />
                  </Pressable>

                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowDatePicker(false)
                        if (date) setSelectedDate(date)
                      }}
                    />
                  )}
                </>
              )}
            </View>
          )}

          <View style={styles.modalActions}>
            <Pressable style={[styles.modalButton, styles.clearButton]} onPress={handleClear}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </Pressable>
            <Pressable style={[styles.modalButton, styles.confirmButton, {backgroundColor: '#4F46E5'}]} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const FAB = memo(({theme, isLandscape, isOnline, onCreateNote}) => {
  const handlePress = useCallback(() => {
    if (isOnline) {
      router.push({
        pathname: '/record/new',
        params: {returnToTabs: 'true'}
      })
    } else {
      // Open the CreateNoteModal when offline
      onCreateNote()
    }
  }, [isOnline, onCreateNote])

  useEffect(() => {
    const handleDeepLink = ({url}) => {
      if (url && url.includes('add_note')) {
        handlePress()
      }
    }

    const getInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL()
        if (url) {
          handleDeepLink({url})
        }
      } catch (error) {
        console.error('Error getting initial URL:', error)
      }
    }

    getInitialURL()
    const subscription = Linking.addEventListener('url', handleDeepLink)

    return () => {
      subscription.remove()
    }
  }, [])

  const {isTabletLandscape} = useScreenDetails()

  return (
    <Pressable
      style={[
        styles.fab,
        {
          backgroundColor: theme.isDarkMode ? 'rgb(27, 24, 95)' : 'rgb(78, 70, 229)',
          borderColor: theme.isDarkMode ? 'rgba(149, 145, 228, 0.2)' : 'rgba(79, 70, 229, 0.1)',
          bottom: isTabletLandscape ? 20 : 90,
          right: isTabletLandscape ? 20 : 10
        }
      ]}
      onPress={handlePress}
    >
      <View style={styles.fabIcon}>
        <Ionicons name={isOnline ? 'mic' : 'create'} size={24} color="#ffffff" />
      </View>
      <Text style={styles.fabText}>{isOnline ? 'Create' : 'Type'}</Text>
    </Pressable>
  )
})

export default function NotesScreen() {
  const realm = useRealm()
  const {user} = useContext(AuthContext)
  const {isOnline} = useAuth()
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const params = useLocalSearchParams()
  const navigationCount = useRef(0)
  const {isDarkMode} = useTheme()
  const noteService = useRef(null)
  const {isTabletLandscape, isLandscape} = useScreenDetails()
  const {gridColumns, isSmallScreen} = useScreenSizeDetection()
  const [deletedNotesModalVisible, setDeletedNotesModalVisible] = useState(false)
  const [createNoteModalVisible, setCreateNoteModalVisible] = useState(false)
  const handleOpenCreateNoteModal = useCallback(() => {
    setCreateNoteModalVisible(true)
  }, [])

  // Define theme objects
  const theme = {
    isDarkMode,
    backgroundColor: isDarkMode ? '#121212' : '#f8fafc',
    cardBackground: isDarkMode ? '#1e1e1e' : '#ffffff',
    textColor: isDarkMode ? '#e0e0e0' : '#1e293b',
    subTextColor: isDarkMode ? '#a0a0a0' : '#475569',
    mutedTextColor: isDarkMode ? '#6b7280' : '#64748b',
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    loadingText: isDarkMode ? '#e0e0e0' : '#1e293b'
  }

  // Initialize note service when realm and user are available
  useEffect(() => {
    if (realm && user) {
      // Use the factory pattern to get the appropriate note service
      const service = createNoteService(realm, user.id, supabase)
      noteService.current = service
    }
  }, [realm, user])

  useEffect(() => {
    navigationCount.current += 1
    console.log('Navigation count:', navigationCount.current)
    console.log('Received params:', params)
  }, [params])

  useEffect(() => {
    if (realm && user) {
      console.log('Loading initial notes from Realm...')
      loadNotes()
    }
  }, [realm, user])

  // Function to load notes from Realm
  const loadNotes = useCallback(async () => {
    if (!noteService.current || !user) return

    setIsLoading(true)
    try {
      console.log('Fetching notes...')
      // Use await since the web implementation might be async
      const allNotes = await noteService.current.getAllNotes()

      // Convert notes to plain objects for React state
      // Note: Structure might differ slightly between web and native implementations
      const plainNotes = Array.isArray(allNotes)
        ? allNotes // If already an array (web implementation might return this)
        : Array.from(allNotes).map(note => ({
            id: note.id,
            title: note.title || 'Untitled',
            content: note.content,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            category: note.category || 'Tasks',
            color: note.color || '#4F46E5',
            isSynced: note.isSynced,
            isCompleted: note.isCompleted || false,
            dueDate: note.dueDate || null,
            priority: note.priority || 'medium',
            reminder: note.reminder || null
          }))

      console.log('Loaded notes:', plainNotes.length)
      setNotes(plainNotes)
    } catch (error) {
      console.error('Error loading notes:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [user])

  // Updated handleDataChange function for NotesScreen component
  const handleDataChange = useCallback((data, changeType, noteId) => {
    console.log(`Data changed (${changeType}), updating UI immediately`, {data, noteId})

    if (changeType === 'FULL_REFRESH' || Array.isArray(data)) {
      // If we received a full array of notes, replace the entire state
      setNotes(data)
      return
    }

    // Handle both hard and soft delete operations
    if ((changeType === 'DELETE' || changeType === 'SOFT_DELETE') && noteId) {
      console.log(`Removing ${changeType === 'SOFT_DELETE' ? 'soft-deleted' : 'deleted'} note from UI:`, noteId)
      // Remove deleted note from the state immediately
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId))
      return
    }

    // If we received a single note update
    if (data && noteId) {
      setNotes(prevNotes => {
        // Check if this note already exists in our array
        const existingIndex = prevNotes.findIndex(note => note.id === noteId)

        if (existingIndex >= 0) {
          // Update existing note
          const updatedNotes = [...prevNotes]
          updatedNotes[existingIndex] = data
          return updatedNotes
        } else if (changeType === 'INSERT' || changeType === 'RECOVERY') {
          // Add new note to the beginning of the array
          return [data, ...prevNotes]
        } else {
          // For other cases, keep notes unchanged
          return prevNotes
        }
      })
    }
  }, [])

  useEffect(() => {
    if (noteService.current && user) {
      loadNotes()
    }
  }, [noteService.current, user, loadNotes])

  useEffect(() => {
    if (!noteService.current || !user) return

    // For native platforms, use Realm listeners
    if (Platform.OS !== 'web' && realm) {
      const notesResults = realm.objects('Note').filtered('userId == $0 && isDeleted == false', user.id)

      const listener = (collection, changes) => {
        // Reload notes when changes are detected
        loadNotes()
      }

      // Add the listener
      notesResults.addListener(listener)

      // Remove the listener when the component unmounts
      return () => {
        if (notesResults.isValid()) {
          notesResults.removeListener(listener)
        }
      }
    }
    // For web platform, we use SyncServiceWeb which handles changes via callbacks
    // We still keep a fallback interval for safety
    else if (Platform.OS === 'web' && isOnline) {
      // Web uses a different approach - changes are handled by SyncServiceWeb
      // Set up a simple interval to refresh data periodically as a fallback
      const refreshInterval = setInterval(() => {
        if (isOnline) {
          loadNotes()
        }
      }, 30000) // Refresh every 30 seconds (as fallback)

      return () => {
        clearInterval(refreshInterval)
      }
    }
  }, [realm, user, loadNotes, isOnline])

  const onRefresh = useCallback(() => {
    console.log('Refreshing notes...')
    setRefreshing(true)
    loadNotes()
  }, [loadNotes])

  // Handle new note creation from params
  useEffect(() => {
    if (params?.newNote && !isLoading && noteService.current) {
      console.log('Processing new note from params...')
      try {
        const noteData = JSON.parse(params.newNote)
        console.log('Parsed note data:', noteData)

        // Only save the note if it hasn't been saved already
        if (!noteData.alreadySaved) {
          // Save the note with all fields
          noteService.current.createNote(noteData.title, noteData.content, noteData.category || 'Tasks', noteData.color || '#059669', noteData.isCompleted || false, noteData.dueDate || null, noteData.priority || 'medium')
        }

        // Refresh notes list regardless of whether a new note was created
        loadNotes()
      } catch (error) {
        console.error('Error processing new note:', error)
      }
    }
  }, [params?.newNote, params?.timestamp, isLoading, loadNotes])

  const handleUpdateDueDate = useCallback(
    (noteId, dueDate) => {
      if (!noteService.current) return

      console.log('Updating due date for note:', noteId, dueDate)

      try {
        // Update the note
        const updates = {dueDate: dueDate}
        const success = noteService.current.updateNote(noteId, updates)

        if (success) {
          console.log('Note due date updated successfully')
          loadNotes()
        } else {
          console.log('Failed to update note due date, ID not found')
        }
      } catch (error) {
        console.error('Error updating note due date:', error)
        Alert.alert('Error', 'Failed to update due date')
      }
    },
    [loadNotes]
  )

  const handleUpdateReminder = useCallback(
    (noteId, reminder) => {
      if (!noteService.current) return

      console.log('Updating reminder for note:', noteId, reminder)

      try {
        let success
        if (reminder) {
          success = noteService.current.setReminder(noteId, reminder)
        } else {
          success = noteService.current.clearReminder(noteId)
        }

        if (success) {
          console.log('Note reminder updated successfully')
          loadNotes()
        } else {
          console.log('Failed to update note reminder, ID not found')
        }
      } catch (error) {
        console.error('Error updating note reminder:', error)
        Alert.alert('Error', 'Failed to update reminder')
      }
    },
    [loadNotes]
  )

  const handleUpdatePriority = useCallback(
    (noteId, priority) => {
      if (!noteService.current) return

      console.log('Updating priority for note:', noteId, priority)

      try {
        let success
        if (priority) {
          success = noteService.current.updateNote(noteId, {priority})
        } else {
          success = noteService.current.clearPriority(noteId)
        }

        if (success) {
          console.log('Note priority updated successfully')
          loadNotes()
        } else {
          console.log('Failed to update note priority, ID not found')
        }
      } catch (error) {
        console.error('Error updating note priority:', error)
        Alert.alert('Error', 'Failed to update priority')
      }
    },
    [loadNotes]
  )

  // Handle note deletion
  const handleDeleteNote = useCallback(
    noteId => {
      if (!noteService.current) return

      console.log('Deleting note with ID:', noteId)

      // Optimistic UI update
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId))

      try {
        // Delete the note (soft delete)
        const success = noteService.current.deleteNote(noteId)

        if (!success) {
          console.log('Failed to delete note, ID not found')
          // Revert optimistic update on failure
          loadNotes()
        } else {
          // Make sure to sync this change immediately if on web
          // This isn't necessary but can help ensure changes propagate faster
          if (Platform.OS === 'web' && noteService.current.syncChanges) {
            noteService.current.syncChanges()
          }
        }
      } catch (error) {
        console.error('Error deleting note:', error)
        Alert.alert('Error', 'Failed to delete note')
        // Revert optimistic update on error
        loadNotes()
      }
    },
    [loadNotes]
  )

  // Handle category updates
  const handleUpdateCategory = useCallback(
    (noteId, selectedCategory) => {
      if (!noteService.current || !noteId) return

      console.log('Updating category for note:', noteId, selectedCategory)

      try {
        // Use noteService to update category instead of direct Realm operations
        const success = noteService.current.updateNote(noteId, {
          category: selectedCategory.name,
          color: selectedCategory.color
        })

        if (success) {
          console.log('Note category updated successfully')
          loadNotes()
        } else {
          console.log('Failed to update note category, ID not found')
        }
      } catch (error) {
        console.error('Error updating note category:', error)
        Alert.alert('Error', 'Failed to update category')
      }
    },
    [loadNotes]
  )

  const handleToggleCompletion = useCallback(
    (noteId, isCompleted) => {
      if (!noteService.current) return

      console.log('Toggling completion for note:', noteId, isCompleted)

      // Optimistic UI update - update the state immediately
      setNotes(prevNotes => prevNotes.map(note => (note.id === noteId ? {...note, isCompleted: isCompleted} : note)))

      // Then send the update to the server
      try {
        const success = noteService.current.toggleCompletion(noteId, isCompleted)

        if (!success) {
          console.log('Failed to update note completion status, ID not found')
          // If server update fails, revert the optimistic update
          loadNotes()
        }
      } catch (error) {
        console.error('Error updating note completion status:', error)
        Alert.alert('Error', 'Failed to update completion status')
        // Revert the optimistic update on error
        loadNotes()
      }
    },
    [loadNotes]
  )

  const handleSaveTypedNote = useCallback(
    noteData => {
      if (!noteService.current) return

      try {
        // Create the note
        const noteId = noteService.current.createNote(noteData.title, noteData.content, noteData.category || 'Tasks', noteData.color || '#059669', noteData.isCompleted || false, noteData.dueDate || null, noteData.priority || 'medium')

        console.log('Created new typed note with ID:', noteId)
        loadNotes()
      } catch (error) {
        console.error('Error creating typed note:', error)
        Alert.alert('Error', 'Failed to create note')
      }
    },
    [loadNotes]
  )

  const renderItem = useCallback(({item, index}) => <NoteCard item={item} index={index} onDelete={handleDeleteNote} onUpdateCategory={handleUpdateCategory} onToggleCompletion={handleToggleCompletion} onUpdateDueDate={handleUpdateDueDate} onUpdateReminder={handleUpdateReminder} onUpdatePriority={handleUpdatePriority} theme={theme} isLandscape={Platform.OS === 'web' ? gridColumns > 1 : isLandscape} />, [handleDeleteNote, handleUpdateCategory, handleToggleCompletion, handleUpdateDueDate, handleUpdateReminder, handleUpdatePriority, theme, isLandscape, gridColumns])
  const keyExtractor = useCallback(item => item.id, [])

  const toggleDeletedNotesModal = useCallback(() => {
    setDeletedNotesModalVisible(prev => !prev)
  }, [])

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.backgroundColor
          }
        ]}
      >
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.backgroundColor}]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ResponsiveHeader notesCount={notes.length} onTrashPress={toggleDeletedNotesModal} theme={theme} />

      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={isDarkMode ? '#6b7280' : '#94A3B8'} />
          <Text style={[styles.emptyStateText, {color: theme.mutedTextColor}]}>No notes yet</Text>
          <Text style={[styles.emptyStateSubtext, {color: isDarkMode ? '#6b7280' : '#94A3B8'}]}>Tap the microphone button to create your first note</Text>
        </View>
      ) : (
        <FlatList data={notes} keyExtractor={keyExtractor} renderItem={renderItem} contentContainerStyle={styles.listContainer} removeClippedSubviews={Platform.OS === 'android'} initialNumToRender={5} maxToRenderPerBatch={5} windowSize={5} numColumns={Platform.OS === 'web' ? gridColumns : isLandscape ? 2 : 1} key={Platform.OS === 'web' ? `grid-${gridColumns}` : isLandscape ? 'landscape' : 'portrait'} columnWrapperStyle={(Platform.OS === 'web' && gridColumns > 1) || isLandscape ? styles.columnWrapper : null} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} tintColor={isDarkMode ? '#6366F1' : '#4F46E5'} titleColor={theme.textColor} title="Refreshing..." />} />
      )}
      <FAB theme={theme} isLandscape={isLandscape} isOnline={isOnline} onCreateNote={handleOpenCreateNoteModal} />
      <DeletedNotesModal
        visible={deletedNotesModalVisible}
        onClose={toggleDeletedNotesModal}
        theme={theme}
        noteService={noteService.current} // This is correct
        user={user}
      />
      <CreateNoteModal visible={createNoteModalVisible} onClose={() => setCreateNoteModalVisible(false)} onSave={handleSaveTypedNote} theme={theme} />
      <SyncServiceWeb userId={user?.id} noteService={noteService.current} onDataChange={handleDataChange} />
    </View>
  )
}

const styles = StyleSheet.create({
  actionIcons: {flexDirection: 'row', gap: 12},
  addMeta: {alignItems: 'center', flexDirection: 'row', opacity: 0.7, paddingVertical: 2},
  addMetaItem: {alignItems: 'center', borderColor: 'rgba(0,0,0,0.1)', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, flexDirection: 'row', opacity: 0.7, paddingHorizontal: 6, paddingVertical: 2},
  addMetaText: {fontSize: 12, marginLeft: 4},
  categoryDot: {borderRadius: 4, height: 8, marginRight: 8, width: 8},
  checkbox: {alignItems: 'center', borderRadius: 4, borderWidth: 2, height: 20, justifyContent: 'center', width: 20},
  checkboxContainer: {marginRight: 8},
  clearButton: {backgroundColor: 'rgba(160, 160, 160, 0.36)'},
  clearButtonText: {color: 'rgb(0, 0, 0)', fontWeight: '600'},
  columnWrapper: {justifyContent: 'space-between', marginBottom: 0},
  confirmButton: {backgroundColor: '#4F46E5'},
  confirmButtonText: {color: '#ffffff', fontWeight: '600'},
  container: {flex: 1},
  dateAndDueContainer: {alignItems: 'flex-start', flexDirection: 'column'},
  dateAndMetaContainer: {alignItems: 'flex-start', flex: 1, flexDirection: 'column'},
  dateDisplay: {alignItems: 'center', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12},
  datePickerContainer: {marginBottom: 20},
  dueDate: {alignItems: 'center', flexDirection: 'row', paddingVertical: 2},
  dueDateIcon: {marginRight: 4},
  dueDateText: {fontSize: 12, fontWeight: '500'},
  emptyState: {alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20},
  emptyStateSubtext: {fontSize: 14, marginTop: 8, textAlign: 'center'},
  emptyStateText: {fontSize: 18, fontWeight: '600', marginTop: 12},
  fab: {alignItems: 'center', borderRadius: 30, borderWidth: 1, bottom: Platform.OS === 'ios' ? 100 : 90, elevation: 0, flexDirection: 'row', padding: 15, position: 'absolute', right: 10},
  fabIcon: {marginRight: 6},
  fabText: {color: '#fff', fontSize: 14, fontWeight: '600'},
  iconButton: {padding: 4},
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 0,
    ...Platform.select({
      web: {
        flexWrap: 'wrap',
        gap: 10
      }
    })
  },
  
  // Adjusted container for the list
  listContainer: {
    padding: 16,
    paddingBottom: 140,
    ...Platform.select({
      web: {
        maxWidth: 1450,
        marginHorizontal: 'auto',
        width: '100%'
      }
    })
  },
  priorityOptions: {
    gap: 12,
    marginBottom: 24
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8
  },
  metaContainer: {flexDirection: 'column', gap: 4},
  metaItem: {alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 12, flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 4},
  metaItemsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  metaText: {fontSize: 12, fontWeight: '500', marginLeft: 4},
  minutesContainer: {alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 20},
  modalActions: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 10},
  modalButton: {alignItems: 'center', borderRadius: 8, flex: 1, justifyContent: 'center', marginHorizontal: 5, paddingHorizontal: 24, paddingVertical: 12},
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 480,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 12
  },
  modalHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20},
  modalOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 20,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(5px)'
      }
    })
  },
  modalTitle: {fontSize: 18, fontWeight: '600'},
  clearButton: {
    backgroundColor: 'rgba(220, 220, 220, 0.4)'
  },

  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)'
  },
  cancelButtonText: {
    fontWeight: '600'
  },

  // Updated NoteCard styles for responsive layout
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 0,
    marginBottom: 16,
    padding: 16,
    ...Platform.select({
      web: {
        transition: 'transform 0.2s, box-shadow 0.2s',
        ':hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
        }
      }
    })
  },

  noteCard: {borderRadius: 16, borderWidth: 1, elevation: 0, marginBottom: 16, padding: 16},
  noteCategory: {borderRadius: 12, fontSize: 14, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 4},
  noteContent: {fontSize: 13, lineHeight: 22, marginBottom: 10},
  noteDate: {fontSize: 12, fontWeight: '500', marginBottom: 4},
  noteFooter: {alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8},
  noteHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12},
  noteTitle: {flex: 1, fontSize: 22, fontWeight: '600'},
  priority: {alignItems: 'center', borderRadius: 12, flexDirection: 'row', marginRight: 12, paddingHorizontal: 8, paddingVertical: 4},
  priorityDot: {borderRadius: 6, height: 12, marginRight: 10, width: 12},
  priorityPill: {alignItems: 'center', borderRadius: 12, height: 24, justifyContent: 'center', marginRight: 12, width: 24},
  priorityText: {fontSize: 12, fontWeight: '700'},
  reminder: {alignItems: 'center', flexDirection: 'row', paddingVertical: 2},
  reminderIcon: {marginRight: 4},
  reminderOption: {alignItems: 'center', borderRadius: 8, borderWidth: 1, flex: 1, padding: 10},
  reminderOptions: {flexDirection: 'row', gap: 8, marginBottom: 20},
  reminderText: {fontSize: 12, fontWeight: '500'},
  rightFooterSection: {alignItems: 'center', flexDirection: 'row'},
  selectedOption: {backgroundColor: 'rgba(79, 70, 229, 0.1)', borderColor: '#4F46E5'},
  subtitle: {fontSize: 15, fontWeight: '500'},
  timeDisplay: {alignItems: 'center', borderRadius: 8, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12},
  timePickerContainer: {marginBottom: 20},
  titleContainer: {alignItems: 'center', flexDirection: 'row', flex: 1, marginRight: 12},
  welcomeText: {fontSize: 28, fontWeight: '700', marginBottom: 4}
})

