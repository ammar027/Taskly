import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useScreenDetails } from '@/components/OrientationControl';
import { useTheme } from '@/components/ThemeContext';

export const ResponsiveHeader = ({ notesCount }) => {
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
      {isTabletLandscape ? (
        // Show welcome text in tablet landscape mode
        <>
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
            You have {notesCount} notes
          </Text>
        </>
      ) : (
        // Show image in portrait mode
        <View style={styles.imageContainer}>
          <Image
            style={styles.headerImage}
            source={require("@/icons/adaptive-icon.png")}
            contentFit="cover"
          />
          <Text style={[styles.subtitle, { color: theme.mutedTextColor, marginTop: 8 }]}>
            You have {notesCount} notes
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: { 
    padding: Dimensions.get('window').width > 768 ? 10 : 0, 
    marginTop:5,
    alignItems: 'flex-start',
    borderBottomWidth: 0.3,
    borderBlockColor: 'lightgrey',
  },
  welcomeText: { 
    fontSize: 28, 
    fontWeight: '700', 
    marginBottom: 4 ,
    paddingStart:25,
  },
  subtitle: { 
    fontSize: 15, 
    fontWeight: '500',
    paddingBottom: 2,
    paddingStart:25,
  },
  imageContainer: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 15,

  },
  headerImage: {
    height: 35,
    width: 210,
    borderRadius: 12,
    right:35,
  }
});