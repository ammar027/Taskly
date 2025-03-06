import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  Animated,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/components/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from "expo-navigation-bar";

const WELCOME_SHOWN_KEY = 'welcome_screen_shown';

const WelcomeScreen = () => {
  const { isDarkMode } = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));
  const [buttonAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Check if this is first launch
    checkFirstTimeUser();
    
    // Animate content in sequence
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Update navigation bar color when theme changes
  useEffect(() => {
    const updateNavBar = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgb(30, 30, 30)" : "#ffff");
        // Also set the navigation bar button colors
        await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark");
      } catch (error) {
        console.error("Error setting navigation bar color:", error);
      }
    };

    updateNavBar();
  }, [isDarkMode]);

  const checkFirstTimeUser = async () => {
    try {
      const hasShownWelcome = await AsyncStorage.getItem(WELCOME_SHOWN_KEY);
      
      // If welcome screen has been shown before, redirect to main app
      if (hasShownWelcome === 'true') {
        router.replace('/record/new');
      }
    } catch (error) {
      console.error('Error checking first-time user status:', error);
    }
  };

  const markWelcomeAsShown = async () => {
    try {
      await AsyncStorage.setItem(WELCOME_SHOWN_KEY, 'true');
    } catch (error) {
      console.error('Error saving welcome screen status:', error);
    }
  };

  const handleGetStarted = async () => {
    await markWelcomeAsShown();
    router.replace('/record/new');
  };

  const handleExplore = async () => {
    await markWelcomeAsShown();
    router.replace('/(tabs)');
  };

  return (
    <View style={[
      styles.container, 
      { backgroundColor: isDarkMode ? '#121212' : '#f8fafc' }
    ]}>
      <StatusBar 
        barStyle={isDarkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={isDarkMode ? '#121212' : '#f8fafc'} 
      />
      
      {/* Header logo and branding */}
      <Animated.View style={{ 
        
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }] 
      }}>
        <View style={styles.anicon}>
        <View style={styles.logoContainer}>
          <View style={[styles.iconBackground, { backgroundColor: '#4F46E5' }]}>
            <Ionicons name="mic" size={32} color="white" />
          </View>
          <Text style={[
            styles.appTitle, 
            { color: isDarkMode ? '#ffffff' : '#111827' }
          ]}>
            Taskly
          </Text>
        </View>
        
        <Text style={[
          styles.tagline,
          { color: isDarkMode ? '#e0e0e0' : '#374151' }
        ]}>
          Voice-powered task management
        </Text>
        </View>
      </Animated.View>

      {/* Middle illustration */}
      <Animated.View style={[
        styles.illustrationContainer,
        { opacity: fadeAnim }
      ]}>
        <View style={styles.featureCards}>
          <View style={[
            styles.featureCard, 
            { backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff' }
          ]}>
            <Ionicons name="mic-outline" size={28} color="#4F46E5" />
            <Text style={[
              styles.featureTitle, 
              { color: isDarkMode ? '#ffffff' : '#111827' }
            ]}>
              Voice Commands
            </Text>
            <Text style={[
              styles.featureDescription,
              { color: isDarkMode ? '#a0a0a0' : '#6b7280' }
            ]}>
              Create tasks naturally using your voice
            </Text>
          </View>
          
          <View style={[
            styles.featureCard, 
            { backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff' }
          ]}>
            <Ionicons name="shield-checkmark-outline" size={28} color="#4F46E5" />
            <Text style={[
              styles.featureTitle, 
              { color: isDarkMode ? '#ffffff' : '#111827' }
            ]}>
              On-Device Privacy
            </Text>
            <Text style={[
              styles.featureDescription,
              { color: isDarkMode ? '#a0a0a0' : '#6b7280' }
            ]}>
              Your data stays on your device
            </Text>
          </View>
          
          <View style={[
            styles.featureCard, 
            { backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff' }
          ]}>
            <Ionicons name="notifications-outline" size={28} color="#4F46E5" />
            <Text style={[
              styles.featureTitle, 
              { color: isDarkMode ? '#ffffff' : '#111827' }
            ]}>
              Reminders
            </Text>
            <Text style={[
              styles.featureDescription,
              { color: isDarkMode ? '#a0a0a0' : '#6b7280' }
            ]}>
              Stay on top of your tasks with notifications
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom buttons */}
      <Animated.View style={[
        styles.buttonContainer,
        { opacity: buttonAnim }
      ]}>
        <TouchableOpacity 
          style={[styles.primaryButton, { backgroundColor: '#4F46E5' }]}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.secondaryButton, 
            { 
              borderColor: '#4F46E5',
              backgroundColor: isDarkMode ? 'rgba(79, 70, 229, 0.1)' : 'transparent' 
            }
          ]}
          onPress={handleExplore}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryButtonText, { color: '#4F46E5' }]}>
            Explore Features
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 60,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  anicon:{
    marginTop:15,
    marginBottom: -25,
    paddingHorizontal: 5, 
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBackground: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 20,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginVertical: 0,
  },
  featureCards: {
    width: '100%',
  },
  featureCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderWidth:0.3,
    borderColor:'grey'
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  buttonContainer: {
    marginTop: -10,
    width: '100%',
    marginBottom:20,
  },
  primaryButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WelcomeScreen;