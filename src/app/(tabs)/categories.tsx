import { View, Text, StyleSheet, FlatList, Pressable, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

const STORAGE_KEY = 'notes_data';
const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Work', icon: 'briefcase', color: '#4F46E5', gradient: ['#4F46E5', '#6366F1'] },
  { id: '2', name: 'Personal', icon: 'person', color: '#059669', gradient: ['#059669', '#10B981'] },
  { id: '3', name: 'Ideas', icon: 'bulb', color: '#DB2777', gradient: ['#DB2777', '#EC4899'] },
  { id: '4', name: 'Tasks', icon: 'checkmark-circle', color: '#D97706', gradient: ['#D97706', '#F59E0B'] },
  { id: '5', name: 'Projects', icon: 'folder', color: '#7C3AED', gradient: ['#7C3AED', '#8B5CF6'] },
  { id: '6', name: 'Meetings', icon: 'people', color: '#BE123C', gradient: ['#BE123C', '#E11D48'] },
  { id: '7', name: 'Notes', icon: 'document-text', color: '#4F46E5', gradient: ['#4F46E5', '#6366F1'] },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CategoryNotesList = ({ notes, category, onClose }) => {
  const filteredNotes = notes.filter(note => note.category === category.name);
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
          <Text style={styles.modalTitle}>{category.name}</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyStateText}>No notes in this category</Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item, index }) => (
              <AnimatedPressable 
                style={[styles.noteCard, { backgroundColor: `${item.color}10` }]}
                entering={FadeInUp.delay(index * 100)}
              >
                <View style={styles.noteHeader}>
                  <View style={styles.titleContainer}>
                    <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
                    <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
                  </View>
                </View>
                <Text style={styles.noteContent} numberOfLines={2}>{item.content}</Text>
                <Text style={styles.noteDate}>{item.date}</Text>
              </AnimatedPressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

export default function CategoriesScreen() {
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const savedNotes = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedNotes) {
        const parsedNotes = JSON.parse(savedNotes);
        setNotes(parsedNotes);
        generateCategories(parsedNotes);
      } else {
        // If no notes, just show default categories with zero counts
        setCategories(DEFAULT_CATEGORIES.map(cat => ({...cat, count: 0})));
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setCategories(DEFAULT_CATEGORIES.map(cat => ({...cat, count: 0})));
    } finally {
      setIsLoading(false);
    }
  };

  const generateCategories = useCallback((notesData) => {
    // Count notes per category
    const categoryCounts = {};
    const usedCategories = new Set();
    
    notesData.forEach(note => {
      usedCategories.add(note.category);
      categoryCounts[note.category] = (categoryCounts[note.category] || 0) + 1;
    });
    
    // Generate complete categories list with counts
    const updatedCategories = DEFAULT_CATEGORIES.map(category => {
      return {
        ...category,
        count: categoryCounts[category.name] || 0
      };
    });
    
    // Add any custom categories that might be in notes but not in default list
    notesData.forEach(note => {
      const categoryExists = updatedCategories.some(cat => cat.name === note.category);
      if (!categoryExists) {
        // Add custom category with generic icon
        updatedCategories.push({
          id: `custom-${note.category}`,
          name: note.category,
          icon: 'document-text',
          color: note.color || '#4F46E5',
          gradient: [note.color || '#4F46E5', note.color || '#6366F1'],
          count: categoryCounts[note.category] || 0
        });
      }
    });
    
    setCategories(updatedCategories);
  }, []);

  const handleCategoryPress = (category) => {
    setSelectedCategory(category);
  };

  const closeModal = () => {
    setSelectedCategory(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <Text style={styles.headerSubtitle}>Organize your thoughts</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading categories...</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item, index }) => (
            <AnimatedPressable 
              style={[styles.categoryCard, { backgroundColor: `${item.color}10` }]}
              entering={FadeInUp.delay(index * 100)}
              onPress={() => handleCategoryPress(item)}
            >
              <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={24} color="#ffffff" />
              </View>
              <Text style={styles.categoryName}>{item.name}</Text>
              <Text style={[styles.noteCount, { color: item.color }]}>
                {item.count} {item.count === 1 ? 'note' : 'notes'}
              </Text>
            </AnimatedPressable>
          )}
        />
      )}

      {selectedCategory && (
        <CategoryNotesList 
          notes={notes} 
          category={selectedCategory} 
          onClose={closeModal}
        />
      )}
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    padding: 16,
    margin: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  noteCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#ffffff',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
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
  // Note card styles for modal view
  noteCard: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#ffffff',
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
  noteContent: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 12,
  },
  noteDate: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
});