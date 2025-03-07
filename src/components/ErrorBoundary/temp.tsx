import { View, StyleSheet, FlatList, Pressable, Platform, Linking, Alert, RefreshControl, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategorySelectionModal } from '../../components/Modals/categoriessection';
import CustomAlert from '@/components/Modals/CutomAlert';
import { useTheme } from '@/components/ThemeContext';
import { useScreenDetails } from '@/components/OrientationControl';
import { ResponsiveHeader } from '@/components/ResponsiveHeader'; // Import the new component

// ... (Keep your existing NoteCard and FAB components)

export default function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const params = useLocalSearchParams();
  const navigationCount = useRef(0);
  const { isDarkMode } = useTheme();
  
  // Use your custom hook for orientation and device detection
  const { isTabletLandscape, isLandscape } = useScreenDetails();

  // Define theme objects
  const theme = {
    isDarkMode,
    backgroundColor: isDarkMode ? '#121212' : '#f8fafc',
    cardBackground: isDarkMode ? '#1e1e1e' : '#ffffff',
    textColor: isDarkMode ? '#e0e0e0' : '#1e293b',
    subTextColor: isDarkMode ? '#a0a0a0' : '#475569',
    mutedTextColor: isDarkMode ? '#6b7280' : '#64748b',
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
  };

  // ... (Keep your existing useEffects and functions)

  // Render logic
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.backgroundColor }]}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      {/* Use the new responsive header component */}
      <ResponsiveHeader notesCount={notes.length} />
      
      {notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons 
            name="document-text-outline" 
            size={48} 
            color={isDarkMode ? '#6b7280' : '#94A3B8'} 
          />
          <Text style={[styles.emptyStateText, { color: theme.mutedTextColor }]}>No notes yet</Text>
          <Text style={[styles.emptyStateSubtext, { color: isDarkMode ? '#6b7280' : '#94A3B8' }]}>
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
          numColumns={isLandscape ? 2 : 1} // Use 2 columns in landscape mode
          key={isLandscape ? 'landscape' : 'portrait'} // Force re-render on orientation change
          columnWrapperStyle={isLandscape ? styles.columnWrapper : null} // Apply style in landscape
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4F46E5']}
              tintColor={isDarkMode ? '#6366F1' : '#4F46E5'}
              titleColor={theme.textColor}
              title="Refreshing..."
            />
          }
        />
      )}
      
      <FAB theme={theme} isLandscape={isLandscape} />
    </View>
  );
}

// Keep your existing styles