import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  FlatList, 
  Pressable, 
  Platform, 
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  ScrollView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';

// Storage key constant (was missing)
const STORAGE_KEY = 'notes_storage_key';

// Define categories with improved accessibility and visual hierarchy
export const CATEGORIES = [
    { id: '1', name: 'Work', icon: 'briefcase', color: '#4338CA', gradient: ['#4338CA', '#6366F1'] },
    { id: '2', name: 'Personal', icon: 'person', color: '#047857', gradient: ['#047857', '#10B981'] },
    { id: '3', name: 'Ideas', icon: 'bulb', color: '#BE185D', gradient: ['#BE185D', '#EC4899'] },
    { id: '4', name: 'Tasks', icon: 'checkmark-circle', color: '#B45309', gradient: ['#B45309', '#F59E0B'] },
    { id: '5', name: 'Projects', icon: 'folder', color: '#6D28D9', gradient: ['#6D28D9', '#8B5CF6'] },
    { id: '6', name: 'Meetings', icon: 'people', color: '#9F1239', gradient: ['#9F1239', '#E11D48'] },
  ];

// Missing AnimatedPressable component
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Improved Category Selection Modal with animations and better spacing
export const CategorySelectionModal = ({ visible, onClose, onSelectCategory, currentCategory }) => {
  const fadeAnim = useSharedValue(0);
  
  useEffect(() => {
    if (visible) {
      fadeAnim.value = withSpring(1, { damping: 15 });
    } else {
      fadeAnim.value = withSpring(0);
    }
  }, [visible]);
  
  // Find the current category object if we have a name
  const selectedCategory = currentCategory ? 
    CATEGORIES.find(cat => cat.name === currentCategory) || null : null;
  
  const handleSelectCategory = (category) => {
    onSelectCategory(category);
    onClose();
  };

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      backgroundColor: `rgba(0, 0, 0, ${fadeAnim.value * 0.5})`,
    };
  });

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: 0.9 + (fadeAnim.value * 0.1) }],
      opacity: fadeAnim.value,
    };
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none" // Using our custom animation instead
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.modalOverlay, animatedOverlayStyle]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, animatedContentStyle]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity 
                  onPress={onClose} 
                  style={styles.closeButton}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={CATEGORIES}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.categoriesGrid}
                columnWrapperStyle={styles.columnWrapper}
                renderItem={({ item, index }) => (
                  <Animated.View 
                    entering={FadeInUp.delay(index * 50).springify()}
                    style={styles.categoryItemContainer}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.categoryItem,
                        { backgroundColor: `${item.color}10` },
                        selectedCategory?.id === item.id && styles.selectedCategoryItem,
                        pressed && styles.categoryItemPressed
                      ]}
                      onPress={() => handleSelectCategory(item)}
                      android_ripple={{ color: `${item.color}20`, borderless: false }}
                    >
                      <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
                        <Ionicons name={item.icon} size={20} color="#ffffff" />
                      </View>
                      <Text style={styles.categoryName}>{item.name}</Text>
                      {selectedCategory?.id === item.id && (
                        <View style={styles.checkmarkContainer}>
                          <Ionicons name="checkmark-circle" size={20} color={item.color} />
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                )}
              />
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Improved NoteCard component with gesture feedback
export const NoteCard = memo(({ item, index, onDelete, onUpdateCategory }) => {
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  
  const handlePress = useCallback(() => {
    router.push({
      pathname: '/record/[id]',
      params: { id: item.id }
    });
  }, [item.id]);

  const handleShare = useCallback(() => {
    // Share functionality will be implemented here
    Alert.alert("Share", "Sharing functionality coming soon!");
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

  // Function to truncate text nicely with ellipsis
  const truncateText = (text, maxLength = 80) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      <AnimatedPressable 
        onPress={handlePress}
        style={({ pressed }) => [
          styles.noteCard, 
          { backgroundColor: `${item.color}10` },
          pressed && styles.noteCardPressed
        ]}
        entering={FadeInUp.delay(index * 100).springify()}
        exiting={FadeOutDown}
        android_ripple={{ color: `${item.color}20`, borderless: false }}
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
        <Text style={styles.noteContent} numberOfLines={2}>
          {truncateText(item.content)}
        </Text>
        <View style={styles.noteFooter}>
          <Text style={styles.noteDate}>{item.date}</Text>
          <View style={styles.actionIcons}>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleCategorySelect}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="bookmark-outline" size={18} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleShare}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="share-outline" size={18} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={handleDelete}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
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

// Improved NoteDetails screen with loading states and error handling
export const NoteDetailsScreen = () => {
  const { id } = useLocalSearchParams();
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  
  // Editable state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [categoryColor, setCategoryColor] = useState('');
  
  // Loading indicator animation
  const scaleAnim = useSharedValue(1);
  useEffect(() => {
    const interval = setInterval(() => {
      scaleAnim.value = withSpring(scaleAnim.value === 1 ? 1.1 : 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  const animatedLoadingStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }],
    };
  });
  
  // Load note details
  useEffect(() => {
    const loadNoteDetails = async () => {
      try {
        const savedNotes = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedNotes) {
          const parsedNotes = JSON.parse(savedNotes);
          const foundNote = parsedNotes.find(note => note.id === id);
          
          if (foundNote) {
            console.log('Found note:', foundNote);
            setNote(foundNote);
            setTitle(foundNote.title);
            setContent(foundNote.content);
            setCategory(foundNote.category);
            setCategoryColor(foundNote.color || '#4F46E5');
          } else {
            console.log('Note not found');
            Alert.alert('Error', 'Note not found');
            router.back();
          }
        }
      } catch (error) {
        console.error('Error loading note details:', error);
        Alert.alert('Error', 'Failed to load note details');
      } finally {
        setIsLoading(false);
      }
    };

    loadNoteDetails();
  }, [id]);

  const handleSelectCategory = useCallback((selectedCategory) => {
    setCategory(selectedCategory.name);
    setCategoryColor(selectedCategory.color);
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      return;
    }

    try {
      setIsLoading(true);
      
      // Get current notes
      const savedNotes = await AsyncStorage.getItem(STORAGE_KEY);
      if (!savedNotes) {
        throw new Error('No notes found');
      }
      
      const parsedNotes = JSON.parse(savedNotes);
      
      // Update the specific note
      const updatedNotes = parsedNotes.map(n => {
        if (n.id === id) {
          return {
            ...n,
            title,
            content,
            category,
            color: categoryColor,
            lastEdited: new Date().toISOString(),
          };
        }
        return n;
      });
      
      // Save back to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
      
      // Update local state
      setNote(prev => ({
        ...prev,
        title,
        content,
        category,
        color: categoryColor,
        lastEdited: new Date().toISOString(),
      }));
      
      setIsEditing(false);
      Alert.alert('Success', 'Note updated successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  }, [id, title, content, category, categoryColor]);

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.loadingIndicator, animatedLoadingStyle]}>
          <Ionicons name="document-text-outline" size={48} color="#4F46E5" />
        </Animated.View>
        <Text style={styles.loadingText}>Loading note...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header with back button and edit/save controls */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        
        <View style={styles.headerControls}>
          {isEditing ? (
            <>
              <TouchableOpacity 
                onPress={() => setIsEditing(false)} 
                style={[styles.headerButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleSave} 
                style={[styles.headerButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              onPress={() => setIsEditing(true)} 
              style={styles.editButton}
            >
              <Ionicons name="pencil" size={20} color="#4F46E5" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <ScrollView style={styles.contentContainer} contentContainerStyle={styles.contentWrapper}>
        <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}20`, borderColor: categoryColor }]}>
          {isEditing ? (
            <Pressable 
              onPress={() => setCategoryModalVisible(true)}
              style={styles.categorySelector}
            >
              <Text style={[styles.categoryText, { color: categoryColor }]}>{category || 'Select Category'}</Text>
              <Ionicons name="chevron-down" size={16} color={categoryColor} />
            </Pressable>
          ) : (
            <Text style={[styles.categoryText, { color: categoryColor }]}>{category}</Text>
          )}
        </View>
        
        {/* Note title */}
        {isEditing ? (
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={styles.titleInput}
            placeholder="Enter note title"
            placeholderTextColor="#94A3B8"
            maxLength={100}
          />
        ) : (
          <Text style={styles.noteDetailTitle}>{title}</Text>
        )}
        
        {/* Last edited date */}
        {note?.lastEdited && (
          <Text style={styles.lastEditedText}>
            Last edited: {new Date(note.lastEdited).toLocaleString()}
          </Text>
        )}
        
        {/* Note content */}
        {isEditing ? (
          <TextInput
            value={content}
            onChangeText={setContent}
            style={styles.contentInput}
            placeholder="Enter your note content here..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
          />
        ) : (
          <Text style={styles.noteDetailContent}>{content}</Text>
        )}
      </ScrollView>
      
      <CategorySelectionModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSelectCategory={handleSelectCategory}
        currentCategory={category}
      />
    </View>
  );
};

// Improved Notes Screen with filtering and sorting
export const NotesScreen = () => {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  // Load notes from storage
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const savedNotes = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedNotes) {
          setNotes(JSON.parse(savedNotes));
        }
      } catch (error) {
        console.error('Error loading notes:', error);
        Alert.alert('Error', 'Failed to load notes');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotes();
  }, []);
  
  // Delete note handler
  const handleDeleteNote = useCallback(async (noteId) => {
    try {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
      setNotes(updatedNotes);
      Alert.alert('Success', 'Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      Alert.alert('Error', 'Failed to delete note');
    }
  }, [notes]);
  
  // Update category handler
  const handleUpdateCategory = useCallback(async (noteId, selectedCategory) => {
    console.log('Updating category for note:', noteId, selectedCategory);
    
    try {
      // Get current notes from state
      const updatedNotes = notes.map(note => {
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
      
      // Save back to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
      
      // Update state
      setNotes(updatedNotes);
      Alert.alert('Success', 'Category updated');
      
    } catch (error) {
      console.error('Error updating note category:', error);
      Alert.alert('Error', 'Failed to update category');
    }
  }, [notes]);
  
  // Filter and sort notes
  const filteredAndSortedNotes = useMemo(() => {
    // First filter
    let result = filter === 'all' 
      ? [...notes] 
      : notes.filter(note => note.category === filter);
    
    // Then sort
    switch (sortBy) {
      case 'newest':
        return result.sort((a, b) => new Date(b.lastEdited) - new Date(a.lastEdited));
      case 'oldest':
        return result.sort((a, b) => new Date(a.lastEdited) - new Date(b.lastEdited));
      case 'title':
        return result.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return result;
    }
  }, [notes, filter, sortBy]);
  
  const renderItem = useCallback(({ item, index }) => (
    <NoteCard 
      item={item} 
      index={index} 
      onDelete={handleDeleteNote}
      onUpdateCategory={handleUpdateCategory}
    />
  ), [handleDeleteNote, handleUpdateCategory]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>My Notes</Text>
        <TouchableOpacity 
          onPress={() => router.push('/new-note')}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
      
      {/* Filter tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        <TouchableOpacity 
          style={[
            styles.filterTab, 
            filter === 'all' && styles.activeFilterTab
          ]}
          onPress={() => setFilter('all')}
        >
          <Text style={[
            styles.filterText, 
            filter === 'all' && styles.activeFilterText
          ]}>All</Text>
        </TouchableOpacity>
        
        {CATEGORIES.map(category => (
          <TouchableOpacity 
            key={category.id}
            style={[
              styles.filterTab, 
              filter === category.name && styles.activeFilterTab,
              filter === category.name && { borderColor: category.color }
            ]}
            onPress={() => setFilter(category.name)}
          >
            <Ionicons 
              name={category.icon} 
              size={16} 
              color={filter === category.name ? category.color : '#64748B'} 
              style={styles.filterIcon}
            />
            <Text style={[
              styles.filterText, 
              filter === category.name && styles.activeFilterText,
              filter === category.name && { color: category.color }
            ]}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Sort dropdown */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity 
          style={styles.sortSelector}
          onPress={() => {
            Alert.alert(
              "Sort notes by",
              "Select sorting method",
              [
                { text: "Newest", onPress: () => setSortBy('newest') },
                { text: "Oldest", onPress: () => setSortBy('oldest') },
                { text: "Title", onPress: () => setSortBy('title') },
                { text: "Cancel", style: "cancel" }
              ]
            );
          }}
        >
          <Text style={styles.sortText}>
            {sortBy === 'newest' ? 'Newest first' : 
              sortBy === 'oldest' ? 'Oldest first' : 'Title A-Z'}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#64748B" />
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading your notes...</Text>
        </View>
      ) : filteredAndSortedNotes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No notes found</Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'all' 
              ? "You haven't created any notes yet" 
              : `You don't have any notes in the ${filter} category`}
          </Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/new-note')}
          >
            <Text style={styles.createButtonText}>Create New Note</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedNotes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.notesList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    // Main container styles
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    contentWrapper: {
      paddingVertical: 16,
    },
    
    // Header styles
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 60 : 20,
      paddingBottom: 16,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    backButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: '#F1F5F9',
    },
    headerControls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginLeft: 8,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: '#EEF2FF',
    },
    editButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#4F46E5',
      marginLeft: 6,
    },
    saveButton: {
      backgroundColor: '#4F46E5',
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 14,
    },
    cancelButton: {
      backgroundColor: '#F1F5F9',
    },
    cancelButtonText: {
      color: '#64748B',
      fontWeight: '500',
      fontSize: 14,
    },
    screenTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#1E293B',
    },
    
    // Note details styles
    categoryBadge: {
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 16,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: '600',
    },
    categorySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    noteDetailTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#1E293B',
      marginBottom: 8,
    },
    lastEditedText: {
      fontSize: 12,
      color: '#94A3B8',
      marginBottom: 24,
    },
    noteDetailContent: {
      fontSize: 16,
      lineHeight: 24,
      color: '#334155',
    },
    titleInput: {
      fontSize: 24,
      fontWeight: '700',
      color: '#1E293B',
      marginBottom: 8,
      padding: 0,
    },
    contentInput: {
      fontSize: 16,
      lineHeight: 24,
      color: '#334155',
      marginTop: 16,
      padding: 0,
      minHeight: 300,
    },
    
    // Modal styles
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      width: '85%',
      maxHeight: '70%',
      backgroundColor: 'white',
      borderRadius: 20,
      overflow: 'hidden',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1E293B',
    },
    closeButton: {
      padding: 4,
      borderRadius: 20,
    },
    
    // Category grid styles
    categoriesGrid: {
      padding: 16,
    },
    columnWrapper: {
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    categoryItemContainer: {
      width: '48%',
      marginBottom: 8,
    },
    categoryItem: {
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      height: 110,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    categoryItemPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    selectedCategoryItem: {
      borderWidth: 2,
      borderColor: '#4F46E5',
    },
    categoryIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1E293B',
      textAlign: 'center',
    },
    checkmarkContainer: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    
    // Note card styles
    noteCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    noteCardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    noteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    categoryDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 8,
    },
    noteTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1E293B',
      flex: 1,
    },
    noteCategory: {
      fontSize: 12,
      fontWeight: '600',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      overflow: 'hidden',
      marginLeft: 8,
    },
    noteContent: {
      fontSize: 14,
      color: '#64748B',
      lineHeight: 20,
      marginBottom: 16,
    },
    noteFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    noteDate: {
      fontSize: 12,
      color: '#94A3B8',
    },
    actionIcons: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      padding: 6,
      marginLeft: 16,
    },
    
    // Filter and sort styles
    filterContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    filterTab: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#F1F5F9',
      marginRight: 10,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    activeFilterTab: {
      backgroundColor: '#EEF2FF',
      borderColor: '#4F46E5',
    },
    filterIcon: {
      marginRight: 6,
    },
    filterText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#64748B',
    },
    activeFilterText: {
      color: '#4F46E5',
      fontWeight: '600',
    },
    sortContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    sortLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: '#64748B',
      marginRight: 8,
    },
    sortSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: '#F1F5F9',
    },
    sortText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#1E293B',
      marginRight: 6,
    },
    
    // Loading and empty states
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#F8FAFC',
    },
    loadingIndicator: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#EEF2FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      ...Platform.select({
        ios: {
          shadowColor: '#4F46E5',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#64748B',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: '#F8FAFC',
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#1E293B',
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: '#64748B',
      textAlign: 'center',
      marginBottom: 24,
    },
    createButton: {
      backgroundColor: '#4F46E5',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#4F46E5',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    
    // List styles
    notesList: {
      padding: 16,
      paddingBottom: 32,
    },
    separator: {
      height: 12,
    },
    
    // Add button
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#4F46E5',
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: '#4F46E5',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
        },
        android: {
          elevation: 5,
        },
      }),
    },
  });