import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const REMINDERS = [
  { 
    id: '1', 
    title: 'Team Sync Meeting',
    date: '2024-01-22 10:00 AM',
    priority: 'high',
    completed: false,
    category: 'Work',
    color: '#4F46E5'
  },
  { 
    id: '2', 
    title: 'Review Q1 Goals',
    date: '2024-01-23 2:00 PM',
    priority: 'medium',
    completed: true,
    category: 'Projects',
    color: '#7C3AED'
  },
  { 
    id: '3', 
    title: 'Prepare Presentation',
    date: '2024-01-24 11:00 AM',
    priority: 'high',
    completed: false,
    category: 'Work',
    color: '#4F46E5'
  },
  { 
    id: '4', 
    title: 'Team Lunch',
    date: '2024-01-24 12:30 PM',
    priority: 'low',
    completed: false,
    category: 'Personal',
    color: '#059669'
  },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RemindersScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reminders</Text>
        <Text style={styles.headerSubtitle}>Stay on track</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {REMINDERS.filter(r => !r.completed).length}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {REMINDERS.filter(r => r.completed).length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {REMINDERS.filter(r => r.priority === 'high').length}
          </Text>
          <Text style={styles.statLabel}>High Priority</Text>
        </View>
      </View>

      <FlatList
        data={REMINDERS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item, index }) => (
          <AnimatedPressable 
            style={[styles.reminderCard, { backgroundColor: `${item.color}05` }]}
            entering={FadeInUp.delay(index * 100)}
          >
            <View style={styles.reminderLeft}>
              <Pressable 
                style={[
                  styles.checkbox, 
                  item.completed && styles.checkboxChecked,
                  { borderColor: item.color }
                ]}
              >
                {item.completed && (
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                )}
              </Pressable>
              <View>
                <Text style={[
                  styles.reminderTitle,
                  item.completed && styles.completedText
                ]}>
                  {item.title}
                </Text>
                <View style={styles.reminderMeta}>
                  <Text style={styles.reminderDate}>{item.date}</Text>
                  <View style={[styles.categoryTag, { backgroundColor: `${item.color}15` }]}>
                    <Text style={[styles.categoryText, { color: item.color }]}>{item.category}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={[
              styles.priorityBadge,
              { backgroundColor: item.priority === 'high' ? '#DC2626' : item.priority === 'medium' ? '#D97706' : '#059669' }
            ]}>
              <Text style={styles.priorityText}>
                {item.priority}
              </Text>
            </View>
          </AnimatedPressable>
        )}
      />
      
      <Pressable style={styles.fab}>
        <Ionicons name="add" size={24} color="#ffffff" />
      </Pressable>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  reminderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderDate: {
    fontSize: 13,
    color: '#64748b',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    right: 20,
    backgroundColor: '#4F46E5',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
      },
    }),
  },
});