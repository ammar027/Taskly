import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { memo, useCallback } from 'react';

const SAMPLE_NOTES = [
  { 
    id: '1', 
    title: 'Project Brainstorming', 
    content: 'New features for Q1: AI integration, voice commands, cloud sync',
    date: '2024-01-20',
    category: 'Work',
    color: '#4F46E5'
  },
  { 
    id: '2', 
    title: 'Travel Plans', 
    content: 'Research destinations: Japan, Norway, New Zealand. Check flight prices and best seasons.',
    date: '2024-01-21',
    category: 'Personal',
    color: '#059669'
  },
  { 
    id: '3', 
    title: 'Book Recommendations', 
    content: 'Atomic Habits, Deep Work, The Psychology of Money',
    date: '2024-01-22',
    category: 'Ideas',
    color: '#DB2777'
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const NoteCard = memo(({ item, index }) => {
  const handleShare = useCallback(() => {
    // Share functionality
  }, []);

  const handleBookmark = useCallback(() => {
    // Bookmark functionality
  }, []);

  return (
    <AnimatedPressable 
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
    // Record note functionality
    console.log("pressed")
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
  const renderItem = useCallback(({ item, index }) => (
    <NoteCard item={item} index={index} />
  ), []);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.subtitle}>You have {SAMPLE_NOTES.length} notes</Text>
      </View>
      
      <FlatList
        data={SAMPLE_NOTES}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
      
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