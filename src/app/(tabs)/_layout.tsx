import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Platform, Dimensions, useWindowDimensions, View, Text, StyleSheet } from "react-native"
import { useTheme } from "@/components/ThemeContext"
import { NavigationBarThemeHandler } from "@/components/NavigationBarThemeHandeler"
import React, { useEffect, useState } from "react"
import * as ScreenOrientation from "expo-screen-orientation"
import { Image } from "expo-image"

// Custom hook to detect tablet and orientation
const useDeviceOrientation = () => {
  const window = useWindowDimensions()
  const [orientation, setOrientation] = useState<"PORTRAIT" | "LANDSCAPE">("PORTRAIT")
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkOrientation = async () => {
      const orientationInfo = await ScreenOrientation.getOrientationAsync()
      setOrientation(
        orientationInfo === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
          orientationInfo === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
          ? "LANDSCAPE"
          : "PORTRAIT",
      )
    }

    // Check if device is a tablet (based on screen size)
    const { width, height } = window
    const maxDimension = Math.max(width, height)
    setIsTablet(maxDimension >= 768)

    checkOrientation()

    // Listen for orientation changes
    const subscription = ScreenOrientation.addOrientationChangeListener(() => {
      checkOrientation()
    })

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription)
    }
  }, [window])

  // Return true if it's a tablet in landscape mode
  return {
    isTabletLandscape: isTablet && orientation === "LANDSCAPE",
    isTablet,
    orientation,
  }
}

export default function TabLayout() {
  const { isDarkMode, theme } = useTheme()
  const { isTabletLandscape, isTablet, orientation } = useDeviceOrientation()

  // Define theme colors
  const themeColors = {
    tabBackground: isDarkMode ? "rgb(30, 30, 30)" : "#ffffff",
    tabBorder: isDarkMode ? "#2c2c2c" : "#e5e5e5",
    headerBackground: isDarkMode ? "#121212" : "#ffffff",
    activeTintColor: "#4F46E5",
    inactiveTintColor: isDarkMode ? "#a0a0a0" : "#8E8E93",
    headerTintColor: isDarkMode ? "#e0e0e0" : "#1e293b",
    sidebarBackground: isDarkMode ? "rgb(22, 22, 26)" : "#f5f5f7",
    dividerColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
    appNameColor: isDarkMode ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.8)",
  }

  // Tab configuration data
  const tabConfig = [
    {
      name: "index",
      title: "Notes",
      icon: "document-text-outline",
    },
    {
      name: "categories",
      title: "Categories",
      icon: "folder-outline",
    },
    {
      name: "reminders",
      title: "Reminders",
      icon: "alarm-outline",
    },
    {
      name: "settings",
      title: "Settings",
      icon: "settings-outline",
    },
  ]

  // Styles for tablet sidebar
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "row",
    },
    sidebarContainer: {
      width: 250,
      backgroundColor: themeColors.sidebarBackground,
      borderRightWidth: 1,
      borderRightColor: themeColors.dividerColor,
    },
    appNameContainer: {
      paddingTop: 40,
      paddingBottom: 20,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.dividerColor,
      justifyContent:'flex-end',
      right:60,
    },
    
    image: {
      height: 50,
      width: 270,
      borderRadius: 20, // Add rounded corners
      marginBottom: 10, // Add space below the image
    },
    
    // appName: {
    //   fontSize: 24,
    //   fontWeight: '600',
    //   color: themeColors.appNameColor,
    //   textAlign: 'center', // Center text
    //   marginTop: 5,
    // },
    tabItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 18,
      paddingHorizontal: 20,
      marginVertical: 10,
      borderRadius: 10,
      marginHorizontal: 8,
      marginTop: 10,
    },
    activeTabItem: {
      backgroundColor: isDarkMode ? "rgba(79, 70, 229, 0.15)" : "rgba(79, 70, 229, 0.1)",
    },
    tabIcon: {
      marginRight: 14,
    },
    tabLabel: {
      fontSize: 16,
      fontWeight: "500",
    },
    activeTabLabel: {
      color: themeColors.activeTintColor,
      fontWeight: "600",
    },
    inactiveTabLabel: {
      color: themeColors.inactiveTintColor,
    },
    contentContainer: {
      flex: 1,
    },
  })

  if (isTabletLandscape) {
    return (
      <View style={styles.container}>
        <NavigationBarThemeHandler />

        <Tabs
          screenOptions={{
            tabBarPosition: "left",
            tabBarShowLabel: false, // Hide default labels as we're using custom ones
            tabBarStyle: { display: "none" }, // Hide default tab bar
            headerShown: false,
          }}
          tabBar={({ state, descriptors, navigation }) => (
            <View style={styles.sidebarContainer}>
              <View style={styles.appNameContainer}>
                {/* <Text style={styles.appName}>Taskly</Text> */}
                <Image
                  style={styles.image}
                  source={require("@/icons/adaptive-icon.png")}
                  contentFit="cover"
                />
              </View>

              {state.routes.map((route, index) => {
                const { options } = descriptors[route.key]
                const label = options.title
                const isFocused = state.index === index

                const tab = tabConfig.find((t) => t.name === route.name)
                if (!tab) return null

                return (
                  <View
                    key={route.key}
                    style={[styles.tabItem, isFocused && styles.activeTabItem]}
                    onTouchEnd={() => {
                      const event = navigation.emit({
                        type: "tabPress",
                        target: route.key,
                        canPreventDefault: true,
                      })

                      if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name)
                      }
                    }}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={24}
                      color={
                        isFocused ? themeColors.activeTintColor : themeColors.inactiveTintColor
                      }
                      style={styles.tabIcon}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        isFocused ? styles.activeTabLabel : styles.inactiveTabLabel,
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}
        >
          {tabConfig.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                headerTitle: tab.title,
              }}
            />
          ))}
        </Tabs>
      </View>
    )
  }

  // For phone or tablet in portrait, use the original bottom tabs
  return (
    <>
      <NavigationBarThemeHandler />

      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: themeColors.tabBackground,
            borderTopWidth: 0.3,
            borderTopColor: themeColors.tabBorder,
            height: Platform.OS === "ios" ? 88 : 78,
            paddingBottom: Platform.OS === "ios" ? 28 : 15,
            paddingTop: 15,
            // Make sure the tab bar is positioned above the navigation bar on Android
            ...(Platform.OS === "android" && {
              position: "absolute",
              zIndex: 1,
              bottom: 0,
              left: 0,
              right: 0,
              elevation: 8,
            }),
          },
          tabBarActiveTintColor: themeColors.activeTintColor,
          tabBarInactiveTintColor: themeColors.inactiveTintColor,
          headerStyle: {
            backgroundColor: themeColors.headerBackground,
          },
          headerShown: false,
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: 17,
            color: themeColors.headerTintColor,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
          },
        }}
      >
        {tabConfig.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              headerTitle: tab.title,
              tabBarIcon: ({ size, color }) => (
                <Ionicons name={tab.icon as any} size={size} color={color} />
              ),
            }}
          />
        ))}
      </Tabs>
    </>
  )
}
