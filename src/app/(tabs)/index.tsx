import { View, Text, StyleSheet, FlatList, Pressable, Platform, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategorySelectionModal } from './categoriessection';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const STORAGE_KEY = 'notes_data';

const NoteCard = memo(({ item, index, onDelete, onUpdateCategory }) => {
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  
  const handlePress = useCallback(() => {
    router.push({
      pathname: '/record/[id]',
      params: { id: item.id }
    });
  }, [item.id]);

  const handleShare = useCallback(() => {
    // Share functionality
  }, []);

  const handleCategorySelect = useCallback(() => {
    setCategoryModalVisible(true);
  }, []);

  const handleUpdateCategory = useCallback((category) => {
    if (onUpdateCategory) {
      onUpdateCategory(item.id, category);
    }
  }, [item.id, onUpdateCategory]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: () => onDelete(item.id), style: "destructive" }
      ]
    );
  }, [item.id, onDelete]);

  return (
    <>
      <AnimatedPressable 
        onPress={handlePress}
        style={[styles.noteCard, { backgroundColor: `${item.color}10` }]}
        entering={FadeInUp.delay(index * 100)}
        exiting={FadeOutDown}
      >
        <View style={styles.noteHeader}>
          <View style={styles.titleContainer}>
            <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
            <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
          </View>
          <Text style={[styles.noteCategory, { backgroundColor: `${item.color}20`, color: item.color }]}>
            {item.category}
          </Text>
        </View>
        <Text style={styles.noteContent} numberOfLines={2}>{item.content}</Text>
        <View style={styles.noteFooter}>
          <Text style={styles.noteDate}>{item.date}</Text>
          <View style={styles.actionIcons}>
            <Pressable style={styles.iconButton} onPress={handleCategorySelect}>
              <Ionicons name="folder-outline" size={18} color="#6B7280" />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={18} color="#6B7280" />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={handleDelete}>
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
      />
    </>
  );
});

const FAB = memo(() => {
  const handlePress = useCallback(() => {
    router.push('/record/new');
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

  return (
    <Pressable style={styles.fab} onPress={handlePress}>
      <View style={styles.fabIcon}>
        <Ionicons name="mic" size={24} color="#ffffff" />
      </View>
      <Text style={styles.fabText}>Record Note</Text>
    </Pressable>
  );
});

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const params = useLocalSearchParams();
  const navigationCount = useRef(0);

  useEffect(() => {
    navigationCount.current += 1;
    console.log('Navigation count:', navigationCount.current);
    console.log('Received params:', params);
    console.log('Current notes:', notes);
  }, [params]);

  useEffect(() => {
    console.log('Loading initial notes...');
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      console.log('Fetching notes from storage...');
      const savedNotes = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedNotes) {
        const parsedNotes = JSON.parse(savedNotes);
        console.log('Loaded notes from storage:', parsedNotes);
        setNotes(parsedNotes);
      } else {
        console.log('No notes found in storage');
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      saveNotes();
    }
  }, [notes, isLoading]);

  const saveNotes = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      console.log('Notes saved to storage successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  useEffect(() => {
    if (params?.newNote && !isLoading) {
      console.log('Processing new note from params...');
      try {
        const newNoteData = JSON.parse(params.newNote);
        console.log('Parsed new note data:', newNoteData);
        
        // Set default category if none is provided
        if (!newNoteData.category) {
          newNoteData.category = 'Notes';
          newNoteData.color = '#4F46E5';
        }
        
        setNotes(prevNotes => {
          const isDuplicate = prevNotes.some(note => note.id === newNoteData.id);
          
          if (isDuplicate) {
            console.log('Duplicate note detected, not adding');
            return prevNotes;
          }
          
          const updatedNotes = [newNoteData, ...prevNotes];
          console.log('Updated notes array:', updatedNotes);
          return updatedNotes;
        });
      } catch (error) {
        console.error('Error processing new note:', error);
      }
    }
  }, [params?.newNote, params?.timestamp, isLoading]);

  const handleDeleteNote = useCallback((noteId) => {
    console.log('Deleting note with ID:', noteId);
    
    setNotes(prevNotes => {
      const updatedNotes = prevNotes.filter(note => note.id !== noteId);
      console.log('Notes after deletion:', updatedNotes);
      return updatedNotes;
    });
  }, []);

  const handleUpdateCategory = useCallback(async (noteId, selectedCategory) => {
    console.log('Updating category for note:', noteId, selectedCategory);
    
    try {
      // Update the note with the new category in state
      setNotes(prevNotes => {
        const updatedNotes = prevNotes.map(note => {
          if (note.id === noteId) {
            return {
              ...note,
              category: selectedCategory.name,
              color: selectedCategory.color,
              lastEdited: new Date().toISOString(),
            };
          }
          return note;
        });
        
        console.log('Notes after category update:', updatedNotes);
        return updatedNotes;
      });
      
    } catch (error) {
      console.error('Error updating note category:', error);
      Alert.alert('Error', 'Failed to update category');
    }
  }, []);

  const renderItem = useCallback(({ item, index }) => (
    <NoteCard 
      item={item} 
      index={index} 
      onDelete={handleDeleteNote}
      onUpdateCategory={handleUpdateCategory}
    />
  ), [handleDeleteNote, handleUpdateCategory]);

  const keyExtractor = useCallback((item) => item.id, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.subtitle}>You have {notes.length} notes</Text>
      </View>
      
      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons 
            name="document-text-outline" 
            size={48} 
            color="#94A3B8" 
          />
          <Text style={styles.emptyStateText}>No notes yet</Text>
          <Text style={styles.emptyStateSubtext}>
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
        />
      )}
      
      <FAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 60,
    backgroundColor: '#ffffff',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  noteCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  noteCategory: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noteContent: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 12,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 20,
    right: 20,
    backgroundColor: '#4F46E5',
    borderRadius: 30,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.1)',
  },
  fabIcon: {
    marginRight: 8,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});