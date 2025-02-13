import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';

const CATEGORIES = [
  { id: '1', name: 'Work', icon: 'briefcase', count: 12, color: '#4F46E5', gradient: ['#4F46E5', '#6366F1'] },
  { id: '2', name: 'Personal', icon: 'person', count: 8, color: '#059669', gradient: ['#059669', '#10B981'] },
  { id: '3', name: 'Ideas', icon: 'bulb', count: 5, color: '#DB2777', gradient: ['#DB2777', '#EC4899'] },
  { id: '4', name: 'Tasks', icon: 'checkmark-circle', count: 15, color: '#D97706', gradient: ['#D97706', '#F59E0B'] },
  { id: '5', name: 'Projects', icon: 'folder', count: 7, color: '#7C3AED', gradient: ['#7C3AED', '#8B5CF6'] },
  { id: '6', name: 'Meetings', icon: 'people', count: 4, color: '#BE123C', gradient: ['#BE123C', '#E11D48'] },
];

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function CategoriesScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Categories</Text>
        <Text style={styles.headerSubtitle}>Organize your thoughts</Text>
      </View>

      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item, index }) => (
          <AnimatedPressable 
            style={[styles.categoryCard, { backgroundColor: `${item.color}10` }]}
            entering={FadeInUp.delay(index * 100)}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon} size={24} color="#ffffff" />
            </View>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={[styles.noteCount, { color: item.color }]}>
              {item.count} notes
            </Text>
          </AnimatedPressable>
        )}
      />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
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
  listContainer: {
    padding: 12,
  },
  columnWrapper: {
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
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
});