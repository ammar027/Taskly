import React, {useEffect, useState, useRef} from 'react'
import {supabase} from '@/lib/supabase'
import {Platform} from 'react-native'

export default function SyncServiceWeb({userId, noteService, onDataChange}) {
  const [subscribed, setSubscribed] = useState(false)
  const [lastChangeType, setLastChangeType] = useState(null)
  const debounceTimerRef = useRef(null)

  // Set up Supabase realtime subscription to listen for changes
  useEffect(() => {
    if (!userId || subscribed || Platform.OS !== 'web') return

    // Subscribe to changes on the notes table for this user
    const subscription = supabase
      .channel(`notes_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `user_id=eq.${userId}`
        },
        payload => {
          console.log('Received change from Supabase:', payload)

          // Track the type of change for potential optimizations
          setLastChangeType(payload.eventType)

          // Clear any pending debounced refresh
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
          }

          // Debounce refreshes to handle multiple rapid changes
          debounceTimerRef.current = setTimeout(() => {
            // Pass the payload to refreshData function
            refreshData(payload)
          }, 200) // 200ms debounce
        }
      )
      .subscribe(() => {
        console.log('Supabase realtime subscription established')
        setSubscribed(true)
      })

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      supabase.removeChannel(subscription)
      setSubscribed(false)
    }
  }, [userId, noteService])

  // Function to refresh data based on the type of change
  const refreshData = async payload => {
    if (!noteService) return

    try {
      let changedNoteData = null
      let eventType = payload.eventType
      const noteId = eventType === 'DELETE' ? payload.old.id : payload.new.id

      // Check if this is a soft delete or recovery operation
      let isSoftDelete = false
      let isRecovery = false

      if (eventType === 'UPDATE' && payload.old && payload.new) {
        isSoftDelete = !payload.old.is_deleted && payload.new.is_deleted
        isRecovery = payload.old.is_deleted && !payload.new.is_deleted
      }

      // Handle different types of changes
      if (eventType === 'INSERT') {
        // New note added
        changedNoteData = await noteService.refreshNote(noteId)
        onDataChange(changedNoteData, 'INSERT', noteId)
      } else if (isSoftDelete) {
        // Note was soft-deleted - we need to handle differently than a regular update
        onDataChange(null, 'SOFT_DELETE', noteId)
      } else if (isRecovery) {
        // Note was recovered - fetch it and add back to the list
        changedNoteData = await noteService.refreshNote(noteId)
        onDataChange(changedNoteData, 'RECOVERY', noteId)
      } else if (eventType === 'UPDATE') {
        // Regular update
        changedNoteData = await noteService.refreshNote(noteId)
        onDataChange(changedNoteData, 'UPDATE', noteId)
      } else if (eventType === 'DELETE') {
        // Hard delete
        onDataChange(null, 'DELETE', noteId)
      } else {
        // Fallback - full refresh
        await noteService.clearCache()
        const allNotes = await noteService.getAllNotes(true)
        const deletedNotes = await noteService.getDeletedNotes(true)
        onDataChange(allNotes, 'FULL_REFRESH', null, deletedNotes)
      }
    } catch (error) {
      console.error('Error refreshing data after sync notification:', error)
      // On error, refresh all notes as a fallback
      try {
        await noteService.clearCache()
        const allNotes = await noteService.getAllNotes(true)
        const deletedNotes = await noteService.getDeletedNotes(true)
        onDataChange(allNotes, 'FULL_REFRESH', null, deletedNotes)
      } catch (fallbackError) {
        console.error('Fallback refresh also failed:', fallbackError)
      }
    }
  }

  // This component doesn't render anything visible
  return null
}
