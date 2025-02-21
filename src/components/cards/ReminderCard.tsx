// ReminderCard.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import Swipeable from "react-native-gesture-handler/Swipeable";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ReminderCard = ({ 
  item, 
  index, 
  onToggleComplete, 
  onEdit, 
  onDelete,
  swipeableRef 
}) => {
  const renderRightActions = () => (
    <Pressable 
      style={styles.deleteAction}
      onPress={() => onDelete(item.id)}
    >
      <View style={styles.deleteActionContent}>
        <Ionicons name="trash-outline" size={24} color="#DC2626" />
        <Text style={styles.deleteActionText}>Delete</Text>
      </View>
    </Pressable>
  );

  return (
    <Swipeable
      ref={ref => swipeableRef(ref, item.id)}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <AnimatedPressable
        style={[styles.card, { backgroundColor: `${item.color}08` }]}
        entering={FadeInUp.delay(index * 100)}
        onPress={() => onEdit(item)}
      >
        <View style={styles.cardContent}>
          <View style={styles.leftContent}>
            <Pressable 
              style={[
                styles.checkbox,
                item.completed && styles.checkboxChecked,
                { borderColor: item.color }
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
                  item.completed && styles.completedText
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              
              <View style={styles.metaContainer}>
                <Text style={styles.date}>{item.date}</Text>
                <View style={styles.tagsContainer}>
                  <View 
                    style={[
                      styles.categoryChip,
                      { backgroundColor: `${item.color}15` }
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
                      { backgroundColor: getPriorityColor(item.priority) }
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
            <View style={styles.notificationBadge}>
              <Ionicons name="notifications" size={12} color="#4F46E5" />
            </View>
          )}
        </View>
      </AnimatedPressable>
    </Swipeable>
  );
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return '#DC2626';
    case 'medium': return '#D97706';
    default: return '#059669';
  }
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
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
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  metaContainer: {
    gap: 8,
  },
  date: {
    fontSize: 13,
    color: '#64748b',
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
    backgroundColor: '#EEF2FF',
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
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
    marginVertical: 4,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});