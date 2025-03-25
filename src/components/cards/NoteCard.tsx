import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { memo, useCallback, useState } from 'react';
import { router } from 'expo-router';
import { CategorySelectionModal } from '../../components/Modals/categoriessection';
import CustomAlert from '@/components/Modals/CutomAlert';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const NoteCard = memo(({ item, index, onDelete, onUpdateCategory, onToggleComplete, theme, isLandscape }) => {
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

  const handleToggleComplete = useCallback(() => {
    if (onToggleComplete) {
      onToggleComplete(item.id, !item.isCompleted);
    }
  }, [item.id, item.isCompleted, onToggleComplete]);

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
            opacity: item.isCompleted ? 0.7 : 1, // Reduce opacity for completed tasks
          }
        ]}
        entering={FadeInUp.delay(index * 100)}
        exiting={FadeOutDown}
      >
        <View style={styles.noteHeader}>
          <View style={styles.titleContainer}>
            <Pressable
              onPress={handleToggleComplete}
              style={[
                styles.completionCheckbox,
                {
                  backgroundColor: item.isCompleted ? item.color : 'transparent',
                  borderColor: item.color,
                }
              ]}
            >
              {item.isCompleted && (
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              )}
            </Pressable>
            <View style={[styles.categoryDot, { backgroundColor: item.color }]} />
            <Text 
              style={[
                styles.noteTitle, 
                { 
                  color: theme.textColor,
                  textDecorationLine: item.isCompleted ? 'line-through' : 'none',
                }
              ]} 
              numberOfLines={1}
            >
              {item.title}
            </Text>
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
        <Text 
          style={[
            styles.noteContent, 
            { 
              color: theme.subTextColor,
              textDecorationLine: item.isCompleted ? 'line-through' : 'none',
            }
          ]} 
          numberOfLines={2}
        >
          {item.content}
        </Text>
        <View style={styles.noteFooter}>
          <View style={styles.footerLeft}>
            <Text style={[styles.noteDate, { color: theme.mutedTextColor }]}>
              {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
            {item.isCompleted && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>Completed</Text>
              </View>
            )}
          </View>
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

const styles = StyleSheet.create({
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
  completionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteDate: { 
    fontSize: 16, 
    fontWeight: '500' 
  },
  completedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  actionIcons: { 
    flexDirection: 'row', 
    gap: 12 
  },
  iconButton: { 
    padding: 4 
  },
});

export default NoteCard;