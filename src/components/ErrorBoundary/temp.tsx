// Import the NotificationService at the top of your file
import { NotificationService } from '../services/NotificationService';

export default function NotesScreen() {
  // Your existing code...
  
  // Add notification service ref
  const notificationService = useRef(null);

  // Initialize notification service alongside note service
  useEffect(() => {
    if (realm && user) {
      // Use the factory pattern to get the appropriate note service
      const service = createNoteService(realm, user.id, supabase);
      noteService.current = service;
      
      // Initialize notification service
      notificationService.current = new NotificationService(realm, user.id);
    }
    
    // Clean up notification listeners when component unmounts
    return () => {
      if (notificationService.current) {
        notificationService.current.cleanup();
      }
    };
  }, [realm, user]);

  // For web platform, reschedule any pending notifications on load
  useEffect(() => {
    if (Platform.OS === 'web' && notificationService.current) {
      notificationService.current.rescheduleWebNotifications();
    }
  }, [notificationService.current]);

  // Modified handleUpdateDueDate function
  const handleUpdateDueDate = useCallback(
    (noteId, dueDate) => {
      if (!noteService.current) return;

      console.log('Updating due date for note:', noteId, dueDate);

      try {
        // Update the note
        const updates = { dueDate: dueDate };
        const success = noteService.current.updateNote(noteId, updates);

        if (success) {
          console.log('Note due date updated successfully');
          
          // Find the note to get its details
          const note = notes.find(n => n.id === noteId);
          
          // Schedule or cancel due date notification
          if (dueDate && note) {
            notificationService.current.scheduleDueDateNotification(
              noteId, 
              note.title, 
              note.content, 
              dueDate
            );
          } else {
            notificationService.current.cancelNotification(`duedate-${noteId}`);
          }
          
          loadNotes();
        } else {
          console.log('Failed to update note due date, ID not found');
        }
      } catch (error) {
        console.error('Error updating note due date:', error);
        Alert.alert('Error', 'Failed to update due date');
      }
    },
    [loadNotes, notes]
  );

  // Modified handleUpdateReminder function
  const handleUpdateReminder = useCallback(
    (noteId, reminder) => {
      if (!noteService.current) return;

      console.log('Updating reminder for note:', noteId, reminder);

      try {
        let success;
        if (reminder) {
          success = noteService.current.setReminder(noteId, reminder);
        } else {
          success = noteService.current.clearReminder(noteId);
        }

        if (success) {
          console.log('Note reminder updated successfully');
          
          // Find the note to get its details
          const note = notes.find(n => n.id === noteId);
          
          // Schedule or cancel reminder notification
          if (reminder && note) {
            notificationService.current.scheduleReminderNotification(
              noteId, 
              note.title, 
              note.content, 
              reminder
            );
          } else {
            notificationService.current.cancelNotification(`reminder-${noteId}`);
          }
          
          loadNotes();
        } else {
          console.log('Failed to update note reminder, ID not found');
        }
      } catch (error) {
        console.error('Error updating note reminder:', error);
        Alert.alert('Error', 'Failed to update reminder');
      }
    },
    [loadNotes, notes]
  );

  // Also modify handleDeleteNote to cancel notifications
  const handleDeleteNote = useCallback(
    noteId => {
      if (!noteService.current) return;

      console.log('Deleting note with ID:', noteId);

      try {
        // Delete the note (soft delete)
        const success = noteService.current.deleteNote(noteId);

        if (success) {
          console.log('Note deleted successfully');
          
          // Cancel all notifications for this note
          if (notificationService.current) {
            notificationService.current.cancelNoteNotifications(noteId);
          }
          
          loadNotes();
        } else {
          console.log('Failed to delete note, ID not found');
        }
      } catch (error) {
        console.error('Error deleting note:', error);
        Alert.alert('Error', 'Failed to delete note');
      }
    },
    [loadNotes]
  );

  // Rest of your code remains the same...
}