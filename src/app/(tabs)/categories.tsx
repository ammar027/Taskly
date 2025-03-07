import { View, Text, StyleSheet, FlatList, Pressable, Platform, Modal, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useEffect, useState, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/components/ThemeContext';
import { useScreenDetails } from '@/components/OrientationControl';

const STORAGE_KEY = 'notes_data';
const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Work', icon: 'briefcase', color: '#4F46E5', gradient: ['#4F46E5', '#6366F1'] },
  { id: '2', name: 'Tasks', icon: 'person', color: '#059669', gradient: ['#059669', '#10B981'] },
  { id: '3', name: 'Ideas', icon: 'bulb', color: '#DB2777', gradient: ['#DB2777', '#EC4899'] },
  { id: '4', name: 'Personal', icon: 'checkmark-circle', color: '#D97706', gradient: ['#D97706', '#F59E0B'] },
  { id: '5', name: 'Projects', icon: 'folder', color: '#7C3AED', gradient: ['#7C3AED', '#8B5CF6'] },
  { id: '6', name: 'Meetings', icon: 'people', color: '#BE123C', gradient: ['#BE123C', '#E11D48'] },
  { id: '7', name: 'Notes', icon: 'document-text', color: '#4F46E5', gradient: ['#4F46E5', '#6366F1'] },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const CategoryNotesList = ({ notes, category, onClose }) => {
  const { isDarkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { isTablet, orientation, width } = useScreenDetails();
  
  const themeColors = useMemo(() => ({
    background: isDarkMode ? '#121212' : '#f8fafc',
    cardBackground: isDarkMode ? '#1e1e1e' : '#ffffff',
    textPrimary: isDarkMode ? '#e0e0e0' : '#1e293b',
    textSecondary: isDarkMode ? '#a0a0a0' : '#64748b',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    icon: isDarkMode ? '#e0e0e0' : '#1e293b',
  }), [isDarkMode]);
  
  const filteredNotes = notes.filter(note => note.category === category.name);
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);
  
  // Determine number of columns based on device and orientation
  const numColumns = useMemo(() => {
    if (isTablet) {
      return orientation === 'landscape' ? 2 : 1;
    }
    return 1;
  }, [isTablet, orientation]);
  
  // Calculate note card width based on number of columns and screen width
  const cardWidth = useMemo(() => {
    const padding = 20; // Container padding
    const gap = 16; // Gap between cards
    
    if (numColumns === 1) {
      return '100%';
    }
    
    // For multiple columns, calculate width considering gaps
    const availableWidth = width - (padding * 2);
    const widthPerCard = (availableWidth - (gap * (numColumns - 1))) / numColumns;
    
    return widthPerCard;
  }, [numColumns, width]);
  
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={true}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: themeColors.cardBackground }]}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.icon} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>{category.name}</Text>
          <View style={{ width: 24 }} />
        </View>
        
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={themeColors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: themeColors.textSecondary }]}>No notes in this category</Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.notesListContainer, { 
              alignItems: numColumns > 1 ? 'flex-start' : 'stretch'
            }]}
            numColumns={numColumns}
            key={`notes-${numColumns}`}
            columnWrapperStyle={numColumns > 1 ? styles.noteColumnWrapper : undefined}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={themeColors.textSecondary}
                colors={[category.color]}
                progressBackgroundColor={themeColors.cardBackground}
              />
            }
            renderItem={({ item, index }) => (
              <AnimatedPressable 
                style={[
                  styles.noteCard, 
                  { 
                    backgroundColor: isDarkMode ? `${category.color}20` : `${category.color}10`,
                    borderColor: themeColors.border,
                    width: numColumns > 1 ? cardWidth : undefined,
                    // Enhance elevation for better shadow on Android
                    elevation: 0,
                    // Add shadow for iOS
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                  }
                ]}
                entering={FadeInUp.delay(index * 100)}
              >
                <View style={styles.noteHeader}>
                  <View style={styles.titleContainer}>
                    <View style={[styles.categoryDot, { backgroundColor: item.color || category.color }]} />
                    <Text style={[styles.noteTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                  </View>
                </View>
                <Text style={[styles.noteContent, { color: themeColors.textSecondary }]} numberOfLines={2}>{item.content}</Text>
                <Text style={[styles.noteDate, { color: themeColors.textSecondary }]}>{item.date}</Text>
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
  const [refreshing, setRefreshing] = useState(false);
  const { isDarkMode } = useTheme();
  const { isTablet, orientation, width } = useScreenDetails();
  
  // Create theme colors - use useMemo to optimize
  const themeColors = useMemo(() => ({
    background: isDarkMode ? '#121212' : '#f8fafc',
    cardBackground: isDarkMode ? '#1e1e1e' : '#ffffff',
    textPrimary: isDarkMode ? '#e0e0e0' : '#1e293b',
    textSecondary: isDarkMode ? '#a0a0a0' : '#64748b',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    loadingText: isDarkMode ? '#e0e0e0' : '#1e293b',
  }), [isDarkMode]);

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
      setRefreshing(false);
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotes();
  }, []);

  // Calculate columns based on device and orientation
  const numColumns = useMemo(() => {
    if (isTablet) {
      return orientation === 'landscape' ? 4 : 2;
    }
    // For phone, adjust based on orientation and screen width
    return orientation === 'landscape' ? 3 : 2;
  }, [isTablet, orientation]);
  
  // Calculate responsive card size
  const getCardDimensions = useMemo(() => {
    const padding = 15; // Container padding
    const gapBetweenCards = 12; // Gap between cards
    const totalGapWidth = gapBetweenCards * (numColumns - 1);
    
    // Calculate card width
    const availableWidth = width - (padding * 2);
    const cardWidth = (availableWidth - totalGapWidth) / numColumns;
    
    // Return percentage for more fluid layouts
    return {
      cardWidth: cardWidth,
      // Size of the card (as percentage of container)
      sizePercentage: `${(cardWidth / availableWidth) * 100}%`
    };
  }, [numColumns, width]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <View style={[styles.header, { backgroundColor: themeColors.cardBackground }]}>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Categories</Text>
        <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>Organize your thoughts</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: themeColors.loadingText }}>Loading categories...</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          key={`grid-${numColumns}`} // This forces the list to re-render when numColumns changes
          contentContainerStyle={[
            styles.categoriesListContainer,
            // Adjust padding based on device
            isTablet ? { padding: 20 } : { padding: 12 }
          ]}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.textSecondary}
              colors={['#4F46E5', '#059669', '#DB2777']}
              progressBackgroundColor={themeColors.cardBackground}
            />
          }
          renderItem={({ item, index }) => {
            // Adjust icon size based on device type and card width
            const iconSize = isTablet ? 30 : 24;
            const iconContainerSize = isTablet ? 64 : Math.min(56, getCardDimensions.cardWidth * 0.35);
            
            return (
              <AnimatedPressable 
                style={[
                  styles.categoryCard, 
                  { 
                    backgroundColor: isDarkMode ? `${item.color}20` : `${item.color}10`,
                    borderColor: themeColors.border,
                    width: getCardDimensions.sizePercentage,
                    margin: 5,
                    // Add shadow for better definition
                    shadowColor: isDarkMode ? item.color : '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isDarkMode ? 0.3 : 0.1,
                    shadowRadius: 12,
                    elevation: 0,
                    // Adjust padding based on device
                    padding: isTablet ? 16 : 12,
                  }
                ]}
                entering={FadeInUp.delay(index * 100)}
                onPress={() => handleCategoryPress(item)}
              >
                <View 
                  style={[
                    styles.iconContainer, 
                    { 
                      backgroundColor: item.color,
                      width: iconContainerSize,
                      height: iconContainerSize,
                      borderRadius: iconContainerSize / 3,
                    }
                  ]}
                >
                  <Ionicons name={item.icon} size={iconSize} color="#ffffff" />
                </View>
                <Text 
                  style={[
                    styles.categoryName, 
                    { 
                      color: themeColors.textPrimary,
                      // Responsive font size
                      fontSize: isTablet ? 18 : 16,
                      // Add some letter spacing for better readability
                      letterSpacing: 0.3,
                    }
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.name}
                </Text>
                <Text 
                  style={[
                    styles.noteCount, 
                    { 
                      color: item.color,
                      fontSize: isTablet ? 16 : 14,
                      opacity: 0.9,
                    }
                  ]}
                >
                  {item.count} {item.count === 1 ? 'note' : 'notes'}
                </Text>
              </AnimatedPressable>
            );
          }}
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
    paddingBlockEnd:75,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 0.3,
    paddingRight:20,
    borderBlockColor: 'lightgrey',
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  headerSubtitle: { 
    fontSize: 15, 
    fontWeight: '500',
    opacity: 0.8,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  categoriesListContainer: { 
    paddingVertical: 10,
    paddingRight:25,
  },
  notesListContainer: { 
    padding: 16,
  },
  columnWrapper: { 
    justifyContent: 'flex-start', 
    marginBottom: 4,
  },
  noteColumnWrapper: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    aspectRatio: 1, 
    borderRadius: 20, 
    padding: 33, 
    alignItems: 'center',
    justifyContent: 'center', 
    borderWidth: 1,
  },
  iconContainer: { 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 14,
    // Add inner shadow effect
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 0,
  },
  categoryName: { 
    fontWeight: '600', 
    marginBottom: 6, 
    textAlign: 'center',
    width: '100%',
  },
  noteCount: { 
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContainer: { 
    flex: 1,
  },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 0.5,
    borderBottomColor: 'lightgrey',
  },
  closeButton: { 
    padding: 8,
    borderRadius: 20,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '600',
    letterSpacing: 0.5,
    right:5,
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
    marginTop: 12,
    opacity: 0.8,
  },
  noteCard: { 
    marginBottom: 16, 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1,
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
    flex: 1 
  },
  categoryDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 8 
  },
  noteTitle: { 
    fontSize: 17, 
    fontWeight: '600', 
    flex: 1 
  },
  noteContent: { 
    fontSize: 15, 
    lineHeight: 22, 
    marginBottom: 12 
  },
  noteDate: { 
    fontSize: 13, 
    fontWeight: '500',
    opacity: 0.8,
  },
});