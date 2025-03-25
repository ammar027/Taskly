// In NotesScreen component, add a function to convert note to reminder
const convertNoteToReminder = useCallback((note) => {
  // Default reminder time 15 minutes from now
  const defaultReminderDate = new Date();
  defaultReminderDate.setMinutes(defaultReminderDate.getMinutes() + 15);

  // Map note priority to reminder priority
  const priorityMap = {
    'low': 'low',
    'medium': 'medium',
    'high': 'high'
  };

  // Map note category to reminder category
  const categoryMap = {
    'Tasks': 'Work',
    'Personal': 'Personal',
    'Ideas': 'Misc',
    // Add more mappings as needed
    'default': 'Work'
  };

  // Prepare reminder data
  const reminderData = {
    title: note.title,
    date: format(note.dueDate || defaultReminderDate, "yyyy-MM-dd h:mm a"),
    priority: priorityMap[note.priority] || 'medium',
    category: categoryMap[note.category] || categoryMap['default'],
    reminderTime: 15, // Default pre-reminder time
    completed: false,
    color: note.color || '#4F46E5' // Use note's color or default
  };

  // Navigate to RemindersScreen with new reminder
  navigation.navigate('RemindersScreen', { 
    newReminder: JSON.stringify(reminderData),
    timestamp: Date.now() // Ensure unique navigation trigger
  });
}, [navigation]);

// Modify your NoteCard or add a method to trigger reminder creation
const handleCreateReminder = useCallback((note) => {
  convertNoteToReminder(note);
}, [convertNoteToReminder]);

// In your NoteCard component or action menu, add a button/option
<TouchableOpacity onPress={() => handleCreateReminder(item)}>
  <Text>Create Reminder</Text>
</TouchableOpacity>