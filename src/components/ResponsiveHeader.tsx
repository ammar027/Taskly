import React from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useScreenDetails } from '@/components/OrientationControl';
import { useTheme } from '@/components/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';

export const ResponsiveHeader = ({ notesCount, onTrashPress }) => {
  const { isDarkMode } = useTheme();
  const { isTabletLandscape, orientation } = useScreenDetails();
  
  // Define theme colors
  const theme = {
    isDarkMode,
    backgroundColor: isDarkMode ? '#121212' : '#f8fafc',
    cardBackground: isDarkMode ? '#1e1e1e' : '#ffffff',
    textColor: isDarkMode ? '#e0e0e0' : '#1e293b',
    subTextColor: isDarkMode ? '#a0a0a0' : '#475569',
    mutedTextColor: isDarkMode ? '#6b7280' : '#64748b',
  };

  return (
    <View style={[
      styles.header, 
      { 
        backgroundColor: theme.cardBackground,
        paddingTop: isTabletLandscape ? 20 : 20 // Adjust padding based on orientation
      }
    ]}>
      <View style={styles.headerContent}>
        {isTabletLandscape ? (
          // Show welcome text in tablet landscape mode
          <View style={styles.welcomeContainer}>
            <Text style={[
              styles.welcomeText, 
              { 
                color: theme.textColor,
                fontSize: 28
              }
            ]}>
              Welcome back!
            </Text>
            <Text style={[styles.subtitle, { color: theme.mutedTextColor }]}>
              You have {notesCount} tasks
            </Text>
          </View>
        ) : (
          // Show image in portrait mode
          <View style={styles.imageContainer}>
            <Image
              style={styles.headerImage}
              source={require("@/icons/adaptive-icon.png")}
              contentFit="cover"
            />
            <Text style={[styles.subtitle, { color: theme.mutedTextColor, marginTop: 8 }]}>
              You have {notesCount} tasks
            </Text>
          </View>
        )}
        
        <View style={styles.headerActions}>
          <SyncStatusIndicator />
          <Pressable 
            style={styles.trashButton} 
            onPress={onTrashPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="trash-outline" 
              size={22} 
              color={theme.isDarkMode ? '#e0e0e0' : '#1e293b'} 
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { 
    padding: Dimensions.get('window').width > 768 ? 10 : 0, 
    marginTop: 5,
    borderBottomWidth: 0.3,
    borderBlockColor: 'lightgrey',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeText: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 4,
  },
  subtitle: { 
    fontSize: 15, 
    fontWeight: '500',
    paddingBottom: 2,
    paddingLeft: 5,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  headerImage: {
    height: 35,
    width: 210,
    borderRadius: 12,
    right:55,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trashButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(207, 206, 206, 0.1)',
  },
});