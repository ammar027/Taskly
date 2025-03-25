/* eslint-disable react-native/no-color-literals */
import React, {useState, useEffect, useCallback, useContext} from 'react'
import {View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, Alert, Platform} from 'react-native'
import {useLocalSearchParams, router} from 'expo-router'
import {Ionicons} from '@expo/vector-icons'
import {StatusBar} from 'expo-status-bar'
import {useTheme} from '@/components/ThemeContext'
import {useRealm} from '@/components/RealmContext'
import {AuthContext} from '@/components/AuthContext'
import NoteService from '@/services/NoteService'
import {createNoteService} from '@/services/NoteServiceFactory'
import {supabase} from '@/lib/supabase'
import {RefreshControl} from 'react-native-gesture-handler'

const LoadingSpinner = () => {
  const {isDarkMode} = useTheme()
  return (
    <View style={[styles.loadingContainer, {backgroundColor: isDarkMode ? '#1a1a1a' : '#FFFFFF'}]}>
      <ActivityIndicator size="large" color={isDarkMode ? '#818cf8' : '#4F46E5'} />
    </View>
  )
}

const ErrorState = ({message, onBack}) => {
  const {isDarkMode} = useTheme()
  return (
    <View style={[styles.errorContainer, {backgroundColor: isDarkMode ? '#1a1a1a' : '#FFFFFF'}]}>
      <Text style={[styles.errorText, {color: isDarkMode ? '#ef4444' : '#EF4444'}]}>{message}</Text>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={[styles.backButtonText, {color: isDarkMode ? '#818cf8' : '#4F46E5'}]}>Go Back</Text>
      </Pressable>
    </View>
  )
}

const Header = ({isEditing, onBack, onEdit, onSave, onCancel, onRefresh, isOnline}) => {
  const {isDarkMode} = useTheme()
  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: isDarkMode ? '#1a1a1a' : '#FFFFFF',
          borderBottomColor: isDarkMode ? '#2d2d2d' : '#E2E8F0'
        }
      ]}
    >
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#e5e5e5' : '#1e293b'} />
      </Pressable>

      <View style={styles.headerRightButtons}>
        {isEditing ? (
          <>
            <Pressable
              style={[
                styles.headerButton,
                styles.cancelButton,
                {
                  backgroundColor: isDarkMode ? '#2d2d2d' : '#F1F5F9'
                }
              ]}
              onPress={onCancel}
            >
              <Text style={[styles.cancelButtonText, {color: isDarkMode ? '#9ca3af' : '#64748B'}]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.headerButton,
                styles.saveButton,
                {
                  backgroundColor: isDarkMode ? '#818cf8' : '#4F46E5'
                }
              ]}
              onPress={onSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.headerButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={20} color={isDarkMode ? '#818cf8' : '#4F46E5'} />
            </Pressable>
            <Pressable style={styles.headerButton} onPress={onEdit}>
              <Ionicons name="pencil" size={20} color={isDarkMode ? '#818cf8' : '#4F46E5'} />
              <Text style={[styles.editButtonText, {color: isDarkMode ? '#818cf8' : '#4F46E5'}]}>Edit</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

export default function NoteDetails() {
  const {isDarkMode} = useTheme()
  const params = useLocalSearchParams()
  const id = params.id?.toString()

  const realm = useRealm()
  const {user, isOnline} = useContext(AuthContext)
  const [note, setNote] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    color: '#4F46E5'
  })
  const [noteService, setNoteService] = useState(null)
  const [refreshIntervalId, setRefreshIntervalId] = useState(null)

  // Initialize note service
  useEffect(() => {
    if (realm && user) {
      console.log('Initializing note service for user:', user.id)
      const service = createNoteService(realm, user.id, supabase)
      setNoteService(service)
    }
  }, [realm, user])

  // Load note data
  const loadNoteDetails = useCallback(async () => {
    if (!noteService || !id) {
      console.log('Cannot load note: no service or ID')
      return
    }

    setIsLoading(true)
    try {
      console.log('Loading note with ID:', id)
      const foundNote = await noteService.getNoteById(id)

      if (foundNote) {
        console.log('Note found:', foundNote.title)
        // Convert Realm object to plain object
        const plainNote = {
          id: foundNote.id,
          title: foundNote.title || 'Untitled',
          content: foundNote.content || '',
          category: foundNote.category || 'Notes',
          color: foundNote.color || '#4F46E5',
          createdAt: foundNote.createdAt ? new Date(foundNote.createdAt) : new Date(),
          updatedAt: foundNote.updatedAt ? new Date(foundNote.updatedAt) : new Date(),
          isCompleted: foundNote.isCompleted || false,
          dueDate: foundNote.dueDate || null,
          priority: foundNote.priority || 'medium',
          reminder: foundNote.reminder || null
        }

        setNote(plainNote)
        // Only update form data if not currently editing
        if (!isEditing) {
          setFormData({
            title: plainNote.title,
            content: plainNote.content,
            category: plainNote.category,
            color: plainNote.color
          })
        }
      } else {
        console.error('Note not found with ID:', id)
        setError('Note not found')
      }
    } catch (err) {
      console.error('Error loading note details:', err)
      setError('Failed to load note details')
    } finally {
      setIsLoading(false)
    }
  }, [id, noteService, isEditing])

  // Initial data load
  useEffect(() => {
    if (noteService && id) {
      loadNoteDetails()
    }
  }, [loadNoteDetails, noteService, id])

  // Web specific polling for updates - but pause during editing
  useEffect(() => {
    // Only for web platform and when not editing
    if (Platform.OS === 'web' && noteService && id && isOnline && !isEditing) {
      console.log('Setting up web refresh interval for note details')
      const intervalId = setInterval(() => {
        console.log('Web refresh: checking for note updates')
        loadNoteDetails()
      }, 10000) // Refresh every 10 seconds

      setRefreshIntervalId(intervalId)

      return () => {
        clearInterval(intervalId)
      }
    }
  }, [loadNoteDetails, noteService, id, isOnline, isEditing])

  // Clear refresh interval when entering edit mode
  useEffect(() => {
    if (isEditing && refreshIntervalId) {
      console.log('Pausing auto-refresh during editing')
      clearInterval(refreshIntervalId)
      setRefreshIntervalId(null)
    }
  }, [isEditing, refreshIntervalId])

  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title cannot be empty')
      return
    }

    try {
      console.log('Saving note changes for ID:', id)
      const success = await noteService.updateNote(id, {
        title: formData.title,
        content: formData.content,
        category: formData.category
      })

      if (success) {
        // Update local state
        setNote(prev => ({
          ...prev,
          title: formData.title,
          content: formData.content,
          category: formData.category,
          updatedAt: new Date()
        }))

        setIsEditing(false)
        Alert.alert('Success', 'Note updated successfully')

        // Manually refresh data once after save
        setTimeout(() => {
          loadNoteDetails()
        }, 500)
      } else {
        Alert.alert('Error', 'Failed to update note')
      }
    } catch (err) {
      console.error('Error saving note:', err)
      Alert.alert('Error', 'Failed to save changes')
    }
  }, [formData, id, noteService, loadNoteDetails])

  const handleCancel = () => {
    if (note) {
      // Reset form data to match the current note data
      setFormData({
        title: note.title,
        content: note.content,
        category: note.category,
        color: note.color
      })
    }
    setIsEditing(false)
  }

  // Custom refresh function for manual refreshes
  const handleRefresh = useCallback(() => {
    if (!isEditing) {
      console.log('Manually refreshing note details')
      loadNoteDetails()
    }
  }, [loadNoteDetails, isEditing])

  if (isLoading && !note) return <LoadingSpinner />
  if (error) return <ErrorState message={error} onBack={() => router.replace('/(tabs)')} />
  if (!note) return <ErrorState message="Note not found" onBack={() => router.replace('/(tabs)')} />

  return (
    <View style={[styles.container, {backgroundColor: isDarkMode ? '#1a1a1a' : '#FFFFFF'}]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <Header isEditing={isEditing} onBack={() => router.replace('/(tabs)')} onEdit={() => setIsEditing(true)} onSave={handleSave} onCancel={handleCancel} onRefresh={handleRefresh} isOnline={isOnline} />

      <ScrollView style={styles.contentContainer} refreshControl={<RefreshControl refreshing={isLoading && !isEditing} onRefresh={handleRefresh} colors={['#4F46E5']} tintColor={isDarkMode ? '#6366F1' : '#4F46E5'} titleColor={isDarkMode ? '#e5e5e5' : '#1E293B'} title="Refreshing..." enabled={!isEditing} />}>
        <View
          style={[
            styles.categoryBadge,
            {
              backgroundColor: `${note.color}${isDarkMode ? '30' : '20'}`,
              borderColor: note.color
            }
          ]}
        >
          {isEditing ? <TextInput style={[styles.categoryInput, {color: note.color}]} value={formData.category} onChangeText={text => setFormData(prev => ({...prev, category: text}))} placeholder="Category" placeholderTextColor={isDarkMode ? '#6b7280' : '#94A3B8'} /> : <Text style={[styles.categoryText, {color: note.color}]}>{note.category}</Text>}
        </View>

        {isEditing ? <TextInput style={[styles.titleInput, {color: isDarkMode ? '#e5e5e5' : '#1E293B'}]} value={formData.title} onChangeText={text => setFormData(prev => ({...prev, title: text}))} placeholder="Title" placeholderTextColor={isDarkMode ? '#6b7280' : '#94A3B8'} /> : <Text style={[styles.titleText, {color: isDarkMode ? '#e5e5e5' : '#1E293B'}]}>{note.title}</Text>}

        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color={isDarkMode ? '#9ca3af' : '#64748B'} />
          <Text style={[styles.dateText, {color: isDarkMode ? '#9ca3af' : '#64748B'}]}>
            {new Date(note.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </Text>
          {note.updatedAt && new Date(note.updatedAt).getTime() !== new Date(note.createdAt).getTime() && (
            <>
              <Text style={[styles.dateText, {color: isDarkMode ? '#9ca3af' : '#64748B'}]}> • Edited: </Text>
              <Text style={[styles.dateText, {color: isDarkMode ? '#9ca3af' : '#64748B'}]}>
                {new Date(note.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </>
          )}
        </View>

        {/* Display additional metadata if available */}
        {(note.dueDate || note.priority || note.reminder) && (
          <View style={styles.metadataContainer}>
            {note.dueDate && (
              <View style={styles.metadataItem}>
                <Ionicons name="time-outline" size={14} color={isDarkMode ? '#9ca3af' : '#64748B'} />
                <Text style={[styles.metadataText, {color: isDarkMode ? '#9ca3af' : '#64748B'}]}>Due: {new Date(note.dueDate).toLocaleDateString()}</Text>
              </View>
            )}

            {note.priority && (
              <View style={styles.metadataItem}>
                <Ionicons name="flag-outline" size={14} color={note.priority === 'high' ? '#ef4444' : note.priority === 'medium' ? '#f59e0b' : '#22c55e'} />
                <Text
                  style={[
                    styles.metadataText,
                    {
                      color: note.priority === 'high' ? '#ef4444' : note.priority === 'medium' ? '#f59e0b' : '#22c55e'
                    }
                  ]}
                >
                  {note.priority.charAt(0).toUpperCase() + note.priority.slice(1)}
                </Text>
              </View>
            )}

            {note.reminder && (
              <View style={styles.metadataItem}>
                <Ionicons name="notifications-outline" size={14} color={isDarkMode ? '#9ca3af' : '#64748B'} />
                <Text style={[styles.metadataText, {color: isDarkMode ? '#9ca3af' : '#64748B'}]}>Reminder: {typeof note.reminder === 'string' ? note.reminder : new Date(note.reminder).toLocaleString()}</Text>
              </View>
            )}
          </View>
        )}

        {isEditing ? <TextInput style={[styles.contentInput, {color: isDarkMode ? '#d1d5db' : '#334155'}]} value={formData.content} onChangeText={text => setFormData(prev => ({...prev, content: text}))} placeholder="Note content..." placeholderTextColor={isDarkMode ? '#6b7280' : '#94A3B8'} multiline textAlignVertical="top" /> : <Text style={[styles.contentText, {color: isDarkMode ? '#d1d5db' : '#334155'}]}>{note.content || 'No content'}</Text>}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  backButton: {
    padding: 8
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  cancelButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  categoryInput: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 80,
    padding: 0
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600'
  },
  container: {
    flex: 1
  },
  contentContainer: {
    flex: 1,
    padding: 20
  },
  contentInput: {
    fontSize: 16,
    height: 300,
    lineHeight: 24,
    padding: 0
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24
  },
  dateContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 24
  },
  dateText: {
    fontSize: 14,
    marginLeft: 4
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4
  },
  errorContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 35
  },
  headerButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    marginLeft: 8,
    padding: 8
  },
  headerRightButtons: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  metadataContainer: {
    marginBottom: 16
  },
  metadataItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 4
  },
  metadataText: {
    fontSize: 12,
    marginLeft: 4
  },
  saveButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    padding: 0
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8
  }
})
