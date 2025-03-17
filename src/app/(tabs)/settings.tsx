import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Platform, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '@/components/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_SESSION_KEY = 'user_session';

export default function SettingsScreen() {
  const { theme, isDarkMode, toggleTheme, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Create theme-specific styles
  const themeColors = {
    backgroundColor: isDarkMode ? '#121212' : '#f5f5f5',
    cardColor: isDarkMode ? '#1e1e1e' : '#ffffff',
    textColor: isDarkMode ? '#e0e0e0' : '#1c1c1e',
    subTextColor: isDarkMode ? '#a0a0a0' : '#8e8e93',
    borderColor: isDarkMode ? '#2c2c2c' : '#e6e6e8',
    iconColor: isDarkMode ? '#e0e0e0' : '#1c1c1e',
    accentColor: '#4F46E5',
    rippleColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    dangerColor: '#ef4444',
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setIsLoading(true);
    try {
      const sessionData = await AsyncStorage.getItem(USER_SESSION_KEY);
      
      if (sessionData) {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (user) {
          setUserData({
            email: user.email,
            name: user.user_metadata?.full_name || 'Taskly User',
            avatar: user.user_metadata?.avatar_url,
            created_at: new Date(user.created_at).toLocaleDateString(),
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeToggle = () => {
    if (theme === ThemeMode.SYSTEM) {
      setThemeMode(isDarkMode ? ThemeMode.LIGHT : ThemeMode.DARK);
    } else {
      setThemeMode(theme === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK);
    }
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setThemeKey(prevKey => prevKey + 1); // Force re-render
  };
  const [themeKey, setThemeKey] = useState(0);
  
  const handleNotificationToggle = () => {
    setPushNotifications(prev => !prev);
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePrivacyPolicy = async () => {
    try {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await WebBrowser.openBrowserAsync('https://taskly-pvc-p.vercel.app/');
    } catch (error) {
      console.error('Error opening privacy policy:', error);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              
              await AsyncStorage.removeItem(USER_SESSION_KEY);
              router.replace('/auth?mode=signin');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const SettingItem = ({ icon, text, rightElement, onPress, showBorder = true }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.settingItem, 
        { 
          backgroundColor: themeColors.cardColor,
          borderBottomWidth: showBorder ? StyleSheet.hairlineWidth : 0,
          borderBottomColor: themeColors.borderColor,
        },
        pressed && { backgroundColor: themeColors.rippleColor }
      ]}
      onPress={onPress}
      android_ripple={{ color: themeColors.rippleColor }}
    >
      <View style={styles.settingLeft}>
        <Ionicons 
          name={icon} 
          size={22} 
          color={themeColors.iconColor} 
          style={styles.settingIcon} 
        />
        <Text style={[styles.settingText, { color: themeColors.textColor }]}>
          {text}
        </Text>
      </View>
      {rightElement}
    </Pressable>
  );

  return (
    <ScrollView 
      style={[
        styles.container, 
        { backgroundColor: themeColors.backgroundColor, paddingTop: insets.top }
      ]}
      contentContainerStyle={styles.contentContainer}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.textColor }]}>Settings</Text>
      </View>
      
      {/* User Profile Section */}
      <View style={styles.section}>
        <View style={[styles.profileCard, { backgroundColor: themeColors.cardColor }]}>
          <View style={styles.profileContent}>
            {userData?.avatar ? (
              <Image 
                source={{ uri: userData.avatar }} 
                style={styles.profileAvatar} 
              />
            ) : (
              <View style={[styles.profileInitials, { backgroundColor: themeColors.accentColor }]}>
                <Text style={styles.initialsText}>
                  {userData ? getInitials(userData.name) : '?'}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: themeColors.textColor }]}>
                {userData?.name || 'Loading...'}
              </Text>
              <Text style={[styles.profileEmail, { color: themeColors.subTextColor }]}>
                {userData?.email || ''}
              </Text>
              <Text style={[styles.profileDate, { color: themeColors.subTextColor }]}>
                {userData ? `Member since ${userData.created_at}` : ''}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.subTextColor }]}>
          Appearance
        </Text>
        <View style={[styles.card, { backgroundColor: themeColors.cardColor }]}>
          <SettingItem 
            icon="moon" 
            text="Dark Mode" 
            rightElement={
              <Switch 
                value={isDarkMode} 
                onValueChange={handleThemeToggle}
                trackColor={{ false: '#767577', true: themeColors.accentColor }}
                thumbColor={isDarkMode ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            }
            showBorder={false}
          />
        </View>

        <Text style={[styles.themeInfo, { color: themeColors.subTextColor }]}>
          {theme === ThemeMode.SYSTEM 
            ? 'Following system appearance' 
            : theme === ThemeMode.DARK ? 'Dark mode enabled' : 'Light mode enabled'}
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.subTextColor }]}>
          About
        </Text>
        <View style={[styles.card, { backgroundColor: themeColors.cardColor }]}>
          <SettingItem 
            icon="information-circle" 
            text="Version" 
            rightElement={
              <Text style={[styles.settingValue, { color: themeColors.subTextColor }]}>
                1.0.0
              </Text>
            }
            showBorder={true}
          />
          <SettingItem 
            icon="shield-checkmark" 
            text="Privacy Policy" 
            rightElement={
              <Ionicons name="chevron-forward" size={20} color={themeColors.subTextColor} />
            }
            onPress={handlePrivacyPolicy}
            showBorder={false}
          />
        </View>
      </View>
      
      {/* Logout section */}
      <View style={styles.section}>
        <View style={[styles.card, { backgroundColor: themeColors.cardColor }]}>
          <SettingItem 
            icon="log-out" 
            text="Logout" 
            rightElement={
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={themeColors.dangerColor} 
              />
            }
            onPress={handleLogout}
            showBorder={false}
          />
        </View>
      </View>
      
      <Text style={[styles.footerText, { color: themeColors.subTextColor }]}>
        © 2025 Taskly
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 13,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: { 
    fontSize: 30, 
    fontWeight: '700', 
    marginBottom: 2 
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    marginRight: 4,
  },
  themeInfo: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 32,
  },
  // New styles for profile section
  profileCard: {
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  profileInitials: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  profileDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});