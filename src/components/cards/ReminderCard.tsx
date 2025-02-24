import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { useTheme } from "@/components/ThemeContext";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ReminderCard = ({ 
  item, 
  index, 
  onToggleComplete, 
  onEdit, 
  onDelete,
  swipeableRef 
}) => {
  const { isDarkMode } = useTheme();

  // Theme-based colors
  const colors = {
    background: isDarkMode ? '#1E293B' : '#FFFFFF',
    text: {
      primary: isDarkMode ? '#F1F5F9' : '#1E293B',
      secondary: isDarkMode ? '#94A3B8' : '#64748B',
      completed: isDarkMode ? '#64748B' : '#94A3B8',
    },
    border: isDarkMode ? '#334155' : '#F1F5F9',
    checkbox: {
      background: isDarkMode ? '#1E293B' : '#FFFFFF',
    },
    notification: {
      background: isDarkMode ? '#312E81' : '#EEF2FF',
      icon: isDarkMode ? '#818CF8' : '#4F46E5',
    },
    deleteAction: {
      background: isDarkMode ? '#7F1D1D' : '#FEE2E2',
      border: isDarkMode ? '#991B1B' : '#FECACA',
      text: isDarkMode ? '#FCA5A5' : '#DC2626',
    },
  };

  const renderRightActions = () => (
    <Pressable 
      style={styles.deleteAction}
      onPress={() => onDelete(item.id)}
    >
      <View style={[
        styles.deleteActionContent,
        {
          backgroundColor: colors.deleteAction.background,
          borderColor: colors.deleteAction.border,
        }
      ]}>
        <Ionicons name="trash-outline" size={24} color={colors.deleteAction.text} />
        <Text style={[
          styles.deleteActionText,
          { color: colors.deleteAction.text }
        ]}>Delete</Text>
      </View>
    </Pressable>
  );

  // Adjust opacity for item background color based on theme
  const getBackgroundColor = () => {
    const opacity = isDarkMode ? '15' : '15';
    return `${item.color}${opacity}`;
  };

  // Adjust category chip background opacity based on theme
  const getCategoryChipBackground = () => {
    const opacity = isDarkMode ? '25' : '15';
    return `${item.color}${opacity}`;
  };

  return (
    <Swipeable
      ref={ref => swipeableRef(ref, item.id)}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <AnimatedPressable
        style={[
          styles.card,
          {
            backgroundColor: getBackgroundColor(),
            borderColor: colors.border,
          }
        ]}
        entering={FadeInUp.delay(index * 100)}
        onPress={() => onEdit(item)}
      >
        <View style={styles.cardContent}>
          <View style={styles.leftContent}>
            <Pressable 
              style={[
                styles.checkbox,
                { 
                  borderColor: item.color,
                  backgroundColor: item.completed ? item.color : colors.checkbox.background
                }
              ]}
              onPress={() => onToggleComplete(item.id)}
              hitSlop={10}
            >
              {item.completed && (
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              )}
            </Pressable>
            
            <View style={styles.textContent}>
              <Text 
                style={[
                  styles.title,
                  { color: colors.text.primary },
                  item.completed && [
                    styles.completedText,
                    { color: colors.text.completed }
                  ]
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              
              <View style={styles.metaContainer}>
                <Text style={[
                  styles.date,
                  { color: colors.text.secondary }
                ]}>{item.date}</Text>
                <View style={styles.tagsContainer}>
                  <View 
                    style={[
                      styles.categoryChip,
                      { backgroundColor: getCategoryChipBackground() }
                    ]}
                  >
                    <Ionicons 
                      name={item.categoryIcon || 'document-outline'} 
                      size={12} 
                      color={item.color} 
                    />
                    <Text style={[styles.categoryText, { color: item.color }]}>
                      {item.category}
                    </Text>
                  </View>
                  
                  <View 
                    style={[
                      styles.priorityChip,
                      { backgroundColor: getPriorityColor(item.priority, isDarkMode) }
                    ]}
                  >
                    <Text style={styles.priorityText}>
                      {item.priority}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {item.notificationId && !item.completed && (
            <View style={[
              styles.notificationBadge,
              { backgroundColor: colors.notification.background }
            ]}>
              <Ionicons 
                name="notifications" 
                size={12} 
                color={colors.notification.icon}
              />
            </View>
          )}
        </View>
      </AnimatedPressable>
    </Swipeable>
  );
};

const getPriorityColor = (priority, isDarkMode) => {
  // Adjusted colors for dark mode
  const colors = {
    high: {
      light: '#DC2626',
      dark: '#991B1B'
    },
    medium: {
      light: '#D97706',
      dark: '#92400E'
    },
    low: {
      light: '#059669',
      dark: '#065F46'
    }
  };

  switch (priority) {
    case 'high':
      return isDarkMode ? colors.high.dark : colors.high.light;
    case 'medium':
      return isDarkMode ? colors.medium.dark : colors.medium.light;
    default:
      return isDarkMode ? colors.low.dark : colors.low.light;
  }
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  textContent: {
    flex: 1,
    gap: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  metaContainer: {
    gap: 8,
  },
  date: {
    fontSize: 13,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  notificationBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAction: {
    width: 80,
    height: '100%',
    marginLeft: 12,
  },
  deleteActionContent: {
    flex: 1,
    borderWidth: 1,
    marginVertical: 4,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});