import { Redirect } from "expo-router"
import { useEffect, useState } from "react"
import * as NavigationBar from "expo-navigation-bar"
import { useTheme, ThemeMode } from "@/components/ThemeContext"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { View, ActivityIndicator } from "react-native"
import { useAuth } from "@/components/AuthContext"

const WELCOME_SHOWN_KEY = "welcome_screen_shown"

export default function Index() {
  const { isDarkMode, theme } = useTheme()
  const { user, isLoading: authLoading, isOnline, pendingSessionValidation } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false)

  // Effect for navigation bar theming
  useEffect(() => {
    const updateNavBar = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgb(30, 30, 30)" : "#ffffff")
        await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark")
        await NavigationBar.setVisibilityAsync("visible")
        await NavigationBar.setPositionAsync("relative")
      } catch (error) {
        console.error("Error setting navigation bar color:", error)
      }
    }

    updateNavBar()
  }, [isDarkMode])

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (theme === ThemeMode.SYSTEM) {
      const subscription = NavigationBar.addVisibilityListener(() => {
        const updateNavBarOnVisibilityChange = async () => {
          try {
            await NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgb(30, 30, 30)" : "#ffffff")
            await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark")
          } catch (error) {
            console.error("Error updating navigation bar on visibility change:", error)
          }
        }

        updateNavBarOnVisibilityChange()
      })

      return () => subscription.remove()
    }
  }, [theme, isDarkMode])

  // Check if welcome screen has been shown
  useEffect(() => {
    const checkWelcomeStatus = async () => {
      try {
        const welcomeStatus = await AsyncStorage.getItem(WELCOME_SHOWN_KEY)
        setHasSeenWelcome(welcomeStatus === "true")
        setIsLoading(false)
      } catch (error) {
        console.error("Error checking welcome status:", error)
        setHasSeenWelcome(true)
        setIsLoading(false)
      }
    }

    checkWelcomeStatus()
  }, [])

  if (isLoading || authLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isDarkMode ? "#121212" : "#f8fafc",
        }}
      >
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  // // First time user flow: Welcome -> Auth -> App
  // if (!hasSeenWelcome) {
  //   return <Redirect href="/welcome" />
  // }

  // Defer to AuthContext for authentication state
  // If offline with pendingSessionValidation, assume user is authenticated
  const isAuthenticated = !!user || (!isOnline && pendingSessionValidation)
  
  // Logged out user flow: Auth -> App
  if (!isAuthenticated) {
    return <Redirect href="/auth?mode=signin" />
  }

  // // Authenticated user: Go to main app
  // return <Redirect href="/record/new" />
  if (isOnline) {
    return <Redirect href="/record/new" />
  }

  if (!isOnline) {
    return <Redirect href="/(tabs)" />
  }
}