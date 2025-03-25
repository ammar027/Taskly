/* eslint-disable react-native/no-color-literals */
import React, {useState, useEffect, useCallback} from 'react'
import {View, Text, StyleSheet, FlatList, Pressable, Modal, SafeAreaView, ActivityIndicator, StatusBar, Platform} from 'react-native'
import {Ionicons} from '@expo/vector-icons'
import Animated, {FadeInUp} from 'react-native-reanimated'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const DeletedNoteCard = ({item, index, onRestore, onHardDelete, theme}) => {
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState('idle') // 'idle', 'pending', 'completed'

  const handleHardDelete = async noteId => {
    setDeleteStatus('pending')
    const success = await onHardDelete(noteId)
    if (success) {
      setDeleteStatus('completed')
      // We'll let the animation play for a moment before closing
      setTimeout(() => {
        setConfirmDeleteVisible(false)
      }, 1500)
    } else {
      setDeleteStatus('idle')
      setConfirmDeleteVisible(false)
    }
  }

  return (
    <AnimatedPressable
      style={[
        styles.noteCard,
        {
          backgroundColor: `${item.color}${theme.isDarkMode ? '20' : '10'}`,
          borderColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
        }
      ]}
      entering={FadeInUp.delay(index * 100)}
    >
      <View style={styles.noteHeader}>
        <View style={styles.titleContainer}>
          <View style={[styles.categoryDot, {backgroundColor: item.color}]} />
          <Text style={[styles.noteTitle, {color: theme.textColor}]} numberOfLines={1}>
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
        >
          {item.category}
        </Text>
      </View>
      <Text style={[styles.noteContent, {color: theme.subTextColor}]} numberOfLines={2}>
        {item.content}
      </Text>
      <View style={styles.noteFooter}>
        <Text style={[styles.noteDate, {color: theme.mutedTextColor}]}>Deleted on {new Date(item.updatedAt).toLocaleDateString()}</Text>
        <View style={styles.actionIcons}>
          <Pressable style={styles.iconButton} onPress={() => onRestore(item.id)}>
            <Ionicons name="refresh-outline" size={20} color={theme.isDarkMode ? '#9ca3af' : '#6B7280'} />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => setConfirmDeleteVisible(true)}>
            <Ionicons name="trash-bin-outline" size={20} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      {/* Confirmation Modal for Hard Delete */}
      <Modal transparent={true} statusBarTranslucent={true} visible={confirmDeleteVisible} animationType="fade" onDismiss={() => StatusBar.setHidden(false, 'fade')} onRequestClose={() => deleteStatus === 'idle' && setConfirmDeleteVisible(false)}>
        <View style={styles.confirmModalOverlay}>
          <View style={[styles.confirmModalContent, {backgroundColor: theme.cardBackground}]}>
            {deleteStatus === 'idle' && (
              <>
                <Text style={[styles.confirmModalTitle, {color: theme.textColor}]}>Permanent Delete</Text>
                <Text style={[styles.confirmModalMessage, {color: theme.subTextColor}]}>This will permanently delete the note and cannot be undone. Are you sure?</Text>
                <View style={styles.confirmModalButtons}>
                  <Pressable style={[styles.confirmModalButton, styles.cancelButton]} onPress={() => setConfirmDeleteVisible(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmModalButton, styles.deleteButton]}
                    onPress={() => {
                      handleHardDelete(item.id)
                    }}
                  >
                    <Text style={styles.deleteButtonText}>Delete Forever</Text>
                  </Pressable>
                </View>
              </>
            )}

            {deleteStatus === 'pending' && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#EF4444" />
                <Text style={[styles.loadingText, {color: theme.textColor, marginTop: 16}]}>Deleting note...</Text>
              </View>
            )}

            {deleteStatus === 'completed' && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={50} color="#10B981" />
                <Text style={[styles.successText, {color: theme.textColor, marginTop: 16}]}>Note deleted successfully</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </AnimatedPressable>
  )
}

const DeletedNotesModal = ({visible, onClose, theme, noteService, user}) => {
  const [deletedNotes, setDeletedNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEmpty, setIsEmpty] = useState(false)
  const [processingAction, setProcessingAction] = useState(false)

  // Load deleted notes
  const loadDeletedNotes = useCallback(async () => {
    if (!noteService) {
      setIsLoading(false)
      setIsEmpty(true)
      return
    }

    try {
      setIsLoading(true)

      let notes = []

      // Check if we're on web and handle differently
      if (Platform.OS === 'web') {
        // For web, we need to access the noteService's Supabase connection
        // No need to check .current since we're already passing noteService.current from parent
        const supabase = noteService.supabase

        if (supabase) {
          const {data, error} = await supabase.from('notes').select('*').eq('user_id', user.id).eq('is_deleted', true).order('updated_at', {ascending: false})

          if (error) throw error

          // Transform the data to match your application's format
          notes = data.map(note => ({
            id: note.id,
            title: note.title || 'Untitled',
            content: note.content || '',
            category: note.category || 'Tasks',
            color: note.color || '#4F46E5',
            updatedAt: note.updated_at,
            createdAt: note.created_at,
            isCompleted: note.is_completed || false,
            isDeleted: note.is_deleted || false,
            priority: note.priority || 'medium',
            dueDate: note.due_date,
            userId: note.user_id
          }))
        } else {
          // Fallback to getDeletedNotes if available
          if (typeof noteService.getDeletedNotes === 'function') {
            notes = await noteService.getDeletedNotes(true)
          } else {
            console.error('No supabase connection and no getDeletedNotes method available')
            setIsEmpty(true)
            return
          }
        }
      } else {
        // For native, use the existing getDeletedNotes function
        notes = await noteService.getDeletedNotes(true)
      }

      setDeletedNotes(notes || [])
      setIsEmpty(!notes || notes.length === 0)
    } catch (error) {
      console.error('Error loading deleted notes:', error)
      setIsEmpty(true)
    } finally {
      setIsLoading(false)
    }
  }, [noteService, user?.id])

  useEffect(() => {
    if (visible) {
      loadDeletedNotes()
    }
  }, [visible, loadDeletedNotes])

  // Restore a note
  const handleRestoreNote = useCallback(
    async noteId => {
      if (!noteService) return

      try {
        setProcessingAction(true)
        // Changed from noteService.recoverNote to noteService.restoreNote to match common naming
        const success = typeof noteService.recoverNote === 'function' ? await noteService.recoverNote(noteId) : typeof noteService.restoreNote === 'function' ? await noteService.restoreNote(noteId) : false

        if (success) {
          console.log('Note restored successfully:', noteId)
          await loadDeletedNotes() // Refresh the list
        }
      } catch (error) {
        console.error('Error restoring note:', error)
      } finally {
        setProcessingAction(false)
      }
    },
    [loadDeletedNotes, noteService]
  )

  // Hard delete a note
  const handleHardDelete = useCallback(
    async noteId => {
      if (!noteService) return false

      try {
        const success = await noteService.permanentlyDeleteNote(noteId)

        if (success) {
          console.log('Note permanently deleted:', noteId)
          return true
        }
        return false
      } catch (error) {
        console.error('Error permanently deleting note:', error)
        return false
      }
    },
    [noteService]
  )

  // Empty trash (permanently delete all deleted notes)
  const handleEmptyTrash = useCallback(async () => {
    if (!noteService || deletedNotes.length === 0) return

    try {
      setProcessingAction(true)

      // Delete each note permanently
      const deletePromises = deletedNotes.map(note => noteService.permanentlyDeleteNote(note.id))

      await Promise.all(deletePromises)

      console.log('All deleted notes permanently removed')
      await loadDeletedNotes() // Refresh the list
    } catch (error) {
      console.error('Error emptying trash:', error)
    } finally {
      setProcessingAction(false)
    }
  }, [deletedNotes, loadDeletedNotes, noteService])

  const renderItem = useCallback(({item, index}) => <DeletedNoteCard item={item} index={index} onRestore={handleRestoreNote} onHardDelete={handleHardDelete} theme={theme} />, [handleRestoreNote, handleHardDelete, theme])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" transparent={false} statusBarTranslucent>
      <SafeAreaView style={[styles.container, {backgroundColor: theme.backgroundColor}]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, {color: theme.textColor}]}>Deleted Notes</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.textColor} />
          </Pressable>
        </View>

        {isLoading || processingAction ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={[styles.loadingText, {color: theme.subTextColor, marginTop: 16}]}>{processingAction ? 'Processing...' : 'Loading notes...'}</Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trash-bin-outline" size={48} color={theme.isDarkMode ? '#6b7280' : '#94A3B8'} />
            <Text style={[styles.emptyText, {color: theme.subTextColor}]}>No deleted notes</Text>
          </View>
        ) : (
          <>
            <View style={styles.actionBar}>
              <Text style={[styles.notesCount, {color: theme.subTextColor}]}>
                {deletedNotes.length} {deletedNotes.length === 1 ? 'note' : 'notes'}
              </Text>
              <Pressable style={[styles.emptyTrashButton, {opacity: deletedNotes.length > 0 ? 1 : 0.5}]} onPress={handleEmptyTrash} disabled={deletedNotes.length === 0}>
                <Text style={styles.emptyTrashText}>Empty Trash</Text>
              </Pressable>
            </View>

            <FlatList data={deletedNotes} renderItem={renderItem} keyExtractor={item => item.id} contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false} />
          </>
        )}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    borderBottomWidth: 0.5,
    borderBottomColor: 'lightgrey'
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700'
  },
  closeButton: {
    padding: 8,
    borderRadius: 20
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  notesCount: {
    fontSize: 15,
    fontWeight: '500'
  },
  emptyTrashButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  emptyTrashText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14
  },
  listContainer: {
    padding: 16
  },
  noteCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 0,
    borderWidth: 1
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  noteTitle: {
    fontSize: 22,
    fontWeight: '600',
    flex: 1
  },
  noteCategory: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  noteContent: {
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 10
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  noteDate: {
    fontSize: 16,
    fontWeight: '500'
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 12
  },
  iconButton: {
    padding: 4
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  confirmModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center'
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12
  },
  confirmModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20
  },
  confirmModalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between'
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6
  },
  cancelButton: {
    backgroundColor: '#e5e7eb'
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600'
  },
  deleteButton: {
    backgroundColor: '#EF4444'
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600'
  }
})

export default DeletedNotesModal
