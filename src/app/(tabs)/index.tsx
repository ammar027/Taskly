import { View, Text, StyleSheet, FlatList, Pressable, Platform, Linking, Alert, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { memo, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { CategorySelectionModal } from '../../components/Modals/categoriessection';
import CustomAlert from '@/components/Modals/CutomAlert';
import { useTheme } from '@/components/ThemeContext';
import { useScreenDetails } from '@/components/OrientationControl';
import { ResponsiveHeader } from '@/components/ResponsiveHeader';
import { useRealm } from '@/components/RealmContext'; 
import { AuthContext } from '@/components/AuthContext'; 
import NoteService from '@/services/NoteService'; 
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import DeletedNotesModal from '@/components/Modals/DeletedNotes';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const NoteCard = memo(({ item, index, onDelete, onUpdateCategory, theme, isLandscape }) => {
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  
  const handlePress = useCallback(() => {
    console.log('Navigating to note with ID:', item.id);
    router.push({
      pathname: '/record/[id]',
      params: { id: item.id }
    });
  }, [item.id]);

  const handleCategorySelect = useCallback(() => {
    setCategoryModalVisible(true);
  }, []);

  const handleUpdateCategory = useCallback((category) => {
    if (onUpdateCategory) {
      onUpdateCategory(item.id, category);
    }
  }, [item.id, onUpdateCategory]);

  return (
    <>
      <AnimatedPressable 
        onPress={handlePress}
        style={[
          styles.noteCard, 
          { 
            backgroundColor: `${item.color}${theme.isDarkMode ? '20' : '10'}`,
            borderColor: theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            width: isLandscape ? '48%' : '100%', // Adjust width based on orientation
          }
        ]}
        entering={FadeInUp.delay(index * 100)}
        exiting={FadeOutDown}
      >
        <View style={styles.noteHeader}>
          <View style={styles.titleContainer}>
            <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
            <Text style={[styles.noteTitle, { color: theme.textColor }]} numberOfLines={1}>{item.title}</Text>
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
        <Text style={[styles.noteContent, { color: theme.subTextColor }]} numberOfLines={2}>{item.content}</Text>
        <View style={styles.noteFooter}>
          <Text style={[styles.noteDate, { color: theme.mutedTextColor }]}>
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
          <View style={styles.actionIcons}>
            <Pressable style={styles.iconButton} onPress={handleCategorySelect}>
              <Ionicons name="folder-outline" size={18} color={theme.isDarkMode ? '#9ca3af' : '#6B7280'} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => setAlertVisible(true)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </Pressable>
          </View>
        </View>
      </AnimatedPressable>
      
      <CategorySelectionModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSelectCategory={handleUpdateCategory}
        currentCategory={item.category}
        theme={theme}
      />
      <CustomAlert
        visible={alertVisible}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        onCancel={() => setAlertVisible(false)}
        onDelete={() => {
          onDelete(item.id);
          setAlertVisible(false);
        }}
        theme={theme}
      />
    </>
  );
});

const FAB = memo(({ theme, isLandscape }) => {
  const handlePress = useCallback(() => {
    router.push({
      pathname: '/record/new',
      params: { returnToTabs: 'true' }
    });
  }, []);

  useEffect(() => {
    const handleDeepLink = ({ url }) => {
      if (url && url.includes('add_note')) {
        handlePress();
      }
    };

    const getInitialURL = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          handleDeepLink({ url });
        }
      } catch (error) {
        console.error('Error getting initial URL:', error);
      }
    };

    getInitialURL();
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  const { isTabletLandscape } = useScreenDetails();

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
        <Ionicons name="mic" size={24} color="#ffffff" />
      </View>
      <Text style={styles.fabText}>Create Task</Text>
    </Pressable>
  );
});



export default function NotesScreen() {
  const realm = useRealm();
  const { user } = useContext(AuthContext);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams();
  const navigationCount = useRef(0);
  const { isDarkMode } = useTheme();
  const noteService = useRef(null);
  const [deletedNotesModalVisible, setDeletedNotesModalVisible] = useState(false);
  
  // Use your custom hook for orientation and device detection
  const { isTabletLandscape, isLandscape } = useScreenDetails();

  // Define theme objects
  const theme = {
    isDarkMode,
    backgroundColor: isDarkMode ? '#121212' : '#f8fafc',
    cardBackground: isDarkMode ? '#1e1e1e' : '#ffffff',
    textColor: isDarkMode ? '#e0e0e0' : '#1e293b',
    subTextColor: isDarkMode ? '#a0a0a0' : '#475569',
    mutedTextColor: isDarkMode ? '#6b7280' : '#64748b',
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    loadingText: isDarkMode ? '#e0e0e0' : '#1e293b',
  };

  // Initialize note service when realm and user are available
  useEffect(() => {
    if (realm && user) {
      noteService.current = new NoteService(realm, user.id);
    }
  }, [realm, user]);

  useEffect(() => {
    navigationCount.current += 1;
    console.log('Navigation count:', navigationCount.current);
    console.log('Received params:', params);
  }, [params]);

  useEffect(() => {
    if (realm && user) {
      console.log('Loading initial notes from Realm...');
      loadNotes();
    }
  }, [realm, user]);

  // Function to load notes from Realm
  const loadNotes = useCallback(() => {
    if (!realm || !user || !noteService.current) return;
    
    try {
      console.log('Fetching notes from Realm...');
      const allNotes = noteService.current.getAllNotes();
      
      // Convert Realm objects to plain objects for React state
      const plainNotes = Array.from(allNotes).map(note => ({
        id: note.id,
        title: note.title || 'Untitled',
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        category: note.category || 'Notes', // Add a default category if needed
        color: note.color || '#4F46E5', // Add a default color if needed
        isSynced: note.isSynced
      }));
      
      console.log('Loaded notes from Realm:', plainNotes.length);
      setNotes(plainNotes);
    } catch (error) {
      console.error('Error loading notes from Realm:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [realm, user]);

  const onRefresh = useCallback(() => {
    console.log('Refreshing notes...');
    setRefreshing(true);
    loadNotes();
  }, [loadNotes]);

  // Handle new note creation from params
  useEffect(() => {
    if (params?.newNote && !isLoading && noteService.current) {
      console.log('Processing new note from params...');
      try {
        const newNoteData = JSON.parse(params.newNote);
        console.log('Parsed new note data:', newNoteData);
        
        // Set default category if none is provided
        const category = newNoteData.category || 'Notes';
        const color = newNoteData.color || '#4F46E5';
        
        // Create the note in Realm
        const noteId = noteService.current.createNote(
          newNoteData.title || 'Untitled',
          newNoteData.content || '',
          category,
          color
        );
        
        console.log('Created new note in Realm with ID:', noteId);
        
        // Refresh the notes list
        loadNotes();
      } catch (error) {
        console.error('Error processing new note:', error);
      }
    }
  }, [params?.newNote, params?.timestamp, isLoading, loadNotes]);

  // Handle note deletion
  const handleDeleteNote = useCallback((noteId) => {
    if (!noteService.current) return;
    
    console.log('Deleting note with ID:', noteId);
    
    try {
      // Delete the note in Realm (soft delete)
      const success = noteService.current.deleteNote(noteId);
      
      if (success) {
        console.log('Note deleted successfully');
        // Refresh the notes list
        loadNotes();
      } else {
        console.log('Failed to delete note, ID not found');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Failed to delete note');
    }
  }, [loadNotes]);

  // Handle category updates
  const handleUpdateCategory = useCallback((noteId, selectedCategory) => {
    if (!noteService.current || !noteId) return;
    
    console.log('Updating category for note:', noteId, selectedCategory);
    
    try {
      // Get the note from Realm
      const note = noteService.current.getNoteById(noteId);
      
      if (note) {
        // Update the note in Realm
        realm.write(() => {
          note.category = selectedCategory.name;
          note.color = selectedCategory.color;
          note.updatedAt = new Date();
          note.isSynced = false; // Mark for sync
        });
        
        console.log('Note category updated successfully');
        // Refresh the notes list
        loadNotes();
      } else {
        console.log('Failed to update note category, ID not found');
      }
    } catch (error) {
      console.error('Error updating note category:', error);
      Alert.alert('Error', 'Failed to update category');
    }
  }, [realm, loadNotes]);

  // Set up Realm change listener
  useEffect(() => {
    if (!realm || !user) return;
    
    // Subscribe to changes in the Note objects
    const notesResults = realm.objects('Note').filtered('userId == $0 && isDeleted == false', user.id);
    
    const listener = (collection, changes) => {
      // Reload notes when changes are detected
      loadNotes();
    };
    
    // Add the listener
    notesResults.addListener(listener);
    
    // Remove the listener when the component unmounts
    return () => {
      if (notesResults.isValid()) {
        notesResults.removeListener(listener);
      }
    };
  }, [realm, user, loadNotes]);

  const renderItem = useCallback(({ item, index }) => (
    <NoteCard 
      item={item} 
      index={index} 
      onDelete={handleDeleteNote}
      onUpdateCategory={handleUpdateCategory}
      theme={theme}
      isLandscape={isLandscape}
    />
  ), [handleDeleteNote, handleUpdateCategory, theme, isLandscape]);

  const keyExtractor = useCallback((item) => item.id, []);

  const toggleDeletedNotesModal = useCallback(() => {
    setDeletedNotesModalVisible(prev => !prev);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.backgroundColor }]}>
        <ActivityIndicator size="large" color="#4F46E5"/>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ResponsiveHeader
        notesCount={notes.length} 
        onTrashPress={toggleDeletedNotesModal} 
        theme={theme} 
      />  
      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons 
            name="document-text-outline" 
            size={48} 
            color={isDarkMode ? '#6b7280' : '#94A3B8'} 
          />
          <Text style={[styles.emptyStateText, { color: theme.mutedTextColor }]}>No notes yet</Text>
          <Text style={[styles.emptyStateSubtext, { color: isDarkMode ? '#6b7280' : '#94A3B8' }]}>
            Tap the microphone button to create your first note
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          numColumns={isLandscape ? 2 : 1} // Use 2 columns in landscape mode
          key={isLandscape ? 'landscape' : 'portrait'} // Key change forces FlatList re-render on orientation change
          columnWrapperStyle={isLandscape ? styles.columnWrapper : null} // Apply style to wrap columns in landscape
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4F46E5']}
              tintColor={isDarkMode ? '#6366F1' : '#4F46E5'}
              titleColor={theme.textColor}
              title="Refreshing..."
            />
          }
        />
      )}
      
      <FAB theme={theme} isLandscape={isLandscape} />
            <DeletedNotesModal
              visible={deletedNotesModalVisible}
              onClose={toggleDeletedNotesModal}
              theme={theme}
              noteService={noteService}
            />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  welcomeText: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  subtitle: { 
    fontSize: 15, 
    fontWeight: '500' 
  },
  listContainer: { 
    padding: 16 
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 0 // Reset margin since item has its own margin
  },
  emptyState: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20 
  },
  emptyStateText: { 
    fontSize: 18, 
    fontWeight: '600', 
    marginTop: 12 
  },
  emptyStateSubtext: { 
    fontSize: 14, 
    textAlign: 'center', 
    marginTop: 8 
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
  fab: { 
    position: 'absolute', 
    bottom: Platform.OS === 'ios' ? 100 : 90, 
    right: 10, 
    borderRadius: 30, 
    padding: 15, 
    flexDirection: 'row', 
    alignItems: 'center', 
    elevation: 0, 
    borderWidth: 1 
  },
  fabIcon: { 
    marginRight: 6 
  },
  fabText: { 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '600' 
  },
});