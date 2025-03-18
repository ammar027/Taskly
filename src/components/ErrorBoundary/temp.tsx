// Update the existing FAB component to handle both online and offline states
const FAB = memo(({ theme, isLandscape, isOnline, onCreateNote }) => {
  const handlePress = useCallback(() => {
    if (isOnline) {
      router.push({
        pathname: "/record/new",
        params: { returnToTabs: "true" },
      })
    } else {
      // Open the CreateNoteModal when offline
      onCreateNote()
    }
  }, [isOnline, onCreateNote])

  useEffect(() => {
    const handleDeepLink = ({ url }) => {
      if (url && url.includes("add_note")) {
        handlePress()
      }
    }

    const getInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL()
        if (url) {
          handleDeepLink({ url })
        }
      } catch (error) {
        console.error("Error getting initial URL:", error)
      }
    }

    getInitialURL()
    const subscription = Linking.addEventListener("url", handleDeepLink)

    return () => {
      subscription.remove()
    }
  }, [])

  const { isTabletLandscape } = useScreenDetails()

  return (
    <Pressable
      style={[
        styles.fab,
        {
          backgroundColor: theme.isDarkMode ? "rgb(27, 24, 95)" : "rgb(78, 70, 229)",
          borderColor: theme.isDarkMode ? "rgba(149, 145, 228, 0.2)" : "rgba(79, 70, 229, 0.1)",
          bottom: isTabletLandscape ? 20 : 90,
          right: isTabletLandscape ? 20 : 10,
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.fabIcon}>
        <Ionicons name={isOnline ? "mic" : "create"} size={24} color="#ffffff" />
      </View>
      <Text style={styles.fabText}>{isOnline ? "Create Task" : "Type Note"}</Text>
    </Pressable>
  )
})

// Then update the NotesScreen component to include the necessary state and handlers
export default function NotesScreen() {
  // ... existing code ...
  const [createNoteModalVisible, setCreateNoteModalVisible] = useState(false);
  
  // Handler for opening the create note modal
  const handleOpenCreateNoteModal = useCallback(() => {
    setCreateNoteModalVisible(true);
  }, []);

  // ... rest of the component ...

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <ResponsiveHeader
        notesCount={notes.length}
        onTrashPress={toggleDeletedNotesModal}
        theme={theme}
      />
      
      {/* ... existing code ... */}

      <FAB 
        theme={theme} 
        isLandscape={isLandscape} 
        isOnline={isOnline} 
        onCreateNote={handleOpenCreateNoteModal} 
      />
      
      <DeletedNotesModal
        visible={deletedNotesModalVisible}
        onClose={toggleDeletedNotesModal}
        theme={theme}
        noteService={noteService}
      />
      
      <CreateNoteModal
        visible={createNoteModalVisible}
        onClose={() => setCreateNoteModalVisible(false)}
        onSave={handleSaveTypedNote}
        theme={theme}
      />
    </View>
  )
}