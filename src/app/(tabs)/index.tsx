import { View, Text, StyleSheet, FlatList, Pressable, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const NoteCard = memo(({ item, index }) => {
  const handlePress = useCallback(() => {
    router.push({
      pathname: '/record/[id]',
      params: { id: item.id }
    });
  }, [item.id]);

  const handleShare = useCallback(() => {
    // Share functionality
  }, []);

  const handleBookmark = useCallback(() => {
    // Bookmark functionality
  }, []);

  return (
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
          <Pressable style={styles.iconButton} onPress={handleBookmark}>
            <Ionicons name="bookmark-outline" size={18} color="#6B7280" />
          </Pressable>
          <Pressable style={styles.iconButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color="#6B7280" />
          </Pressable>
        </View>
      </View>
    </AnimatedPressable>
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

const STORAGE_KEY = 'notes_data';

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const params = useLocalSearchParams();
  const navigationCount = useRef(0);

  // Debug logging for params
  useEffect(() => {
    navigationCount.current += 1;
    console.log('Navigation count:', navigationCount.current);
    console.log('Received params:', params);
    console.log('Current notes:', notes);
  }, [params]);

  // Load initial notes
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

  // Handle new note from navigation
  useEffect(() => {
    if (params?.newNote && !isLoading) {
      console.log('Processing new note from params...');
      try {
        const newNoteData = JSON.parse(params.newNote);
        console.log('Parsed new note data:', newNoteData);
        
        setNotes(prevNotes => {
          // Log previous notes
          console.log('Previous notes:', prevNotes);
          
          // Check for duplicate
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

  // Monitor notes state changes
  useEffect(() => {
    console.log('Notes state updated:', notes);
  }, [notes]);

  const renderItem = useCallback(({ item, index }) => (
    <NoteCard item={item} index={index} />
  ), []);

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