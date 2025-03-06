import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '@/components/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

export default function SettingsScreen() {
  const { theme, isDarkMode, toggleTheme, setThemeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [pushNotifications, setPushNotifications] = useState(true);
  
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

      {/* <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.subTextColor }]}>
          Voice Settings
        </Text>
        <View style={[styles.card, { backgroundColor: themeColors.cardColor }]}>
          <SettingItem 
            icon="language" 
            text="Language" 
            rightElement={
              <View style={styles.settingRight}>
                <Text style={[styles.settingValue, { color: themeColors.subTextColor }]}>
                  English
                </Text>
                <Ionicons name="chevron-forward" size={20} color={themeColors.subTextColor} />
              </View>
            }
            showBorder={false}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: themeColors.subTextColor }]}>
          Notifications
        </Text>
        <View style={[styles.card, { backgroundColor: themeColors.cardColor }]}>
          <SettingItem 
            icon="notifications" 
            text="Push Notifications" 
            rightElement={
              <Switch 
                value={pushNotifications} 
                onValueChange={handleNotificationToggle}
                trackColor={{ false: '#767577', true: themeColors.accentColor }}
                thumbColor={pushNotifications ? '#ffffff' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
              />
            }
            showBorder={false}
          />
        </View>
      </View> */}
      
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
            showBorder={true}
          />
          {/* <SettingItem 
            icon="document-text" 
            text="Terms of Service" 
            rightElement={
              <Ionicons name="chevron-forward" size={20} color={themeColors.subTextColor} />
            }
            showBorder={false}
          /> */}
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
    paddingTop:18,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 30, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
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
});