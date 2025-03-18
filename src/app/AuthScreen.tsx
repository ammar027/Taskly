import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Keyboard,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "@/components/ThemeContext"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as NavigationBar from "expo-navigation-bar"
import { supabase } from "@/lib/supabase"
import { Image } from "expo-image"
import NetInfo from "@react-native-community/netinfo"
import { useAuth } from "@/components/AuthContext"

const DEFAULT_AUTH_MODE = "signup" // Set default mode to signup for first visit

const AuthScreen = () => {
  const { isDarkMode } = useTheme()
  const { signIn, signUp, isOnline } = useAuth()
  const params = useLocalSearchParams()
  const isSignUp = params.mode ? params.mode === "signup" : DEFAULT_AUTH_MODE === "signup"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [secureTextEntry, setSecureTextEntry] = useState(true)
  const [fadeAnim] = useState(new Animated.Value(0))
  const [slideAnim] = useState(new Animated.Value(30))
  const [logoScale] = useState(new Animated.Value(1))
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(true)

  useEffect(() => {
    // Check network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setConnectionStatus(state.isConnected)
    })

    // Animate content
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
    ]).start()

    // Set initial route if no mode is specified
    if (!params.mode) {
      router.replace(`/auth?mode=${DEFAULT_AUTH_MODE}`)
    }

    // Keyboard listeners for logo animation
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true)
        Animated.timing(logoScale, {
          toValue: 0.6,
          duration: 200,
          useNativeDriver: true,
        }).start()
      }
    )

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false)
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start()
      }
    )

    return () => {
      unsubscribe()
      keyboardWillShowListener.remove()
      keyboardWillHideListener.remove()
    }
  }, [])

  // Update navigation bar color when theme changes
  useEffect(() => {
    const updateNavBar = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(isDarkMode ? "rgb(30, 30, 30)" : "#ffffff")
        await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark")
      } catch (error) {
        console.error("Error setting navigation bar color:", error)
      }
    }

    updateNavBar()
  }, [isDarkMode])

  const handleSignIn = async () => {
    Keyboard.dismiss()
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password")
      return
    }

    if (!connectionStatus) {
      Alert.alert(
        "Offline Mode",
        "You appear to be offline. Sign in requires an internet connection.",
        [{ text: "OK" }]
      )
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await signIn(email, password)

      if (error) throw error

      if (data) {
        router.replace("/(tabs)")
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async () => {
    Keyboard.dismiss()
    if (!email || !password || !name) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    if (!connectionStatus) {
      Alert.alert(
        "Offline Mode",
        "You appear to be offline. Sign up requires an internet connection.",
        [{ text: "OK" }]
      )
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await signUp(email, password, { full_name: name })

      if (error) throw error

      if (data?.session) {
        router.replace("/(tabs)")
      } else {
        // Email confirmation required
        Alert.alert(
          "Check your email",
          "We sent you a confirmation email. Please confirm your account before logging in.",
          [{ text: "OK", onPress: () => router.push("/auth?mode=signin") }],
        )
      }
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to sign up")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    Keyboard.dismiss()
    if (!email) {
      Alert.alert("Error", "Please enter your email address")
      return
    }

    if (!connectionStatus) {
      Alert.alert(
        "Offline Mode",
        "You appear to be offline. Password reset requires an internet connection.",
        [{ text: "OK" }]
      )
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "taskly://reset-password",
      })

      if (error) throw error

      Alert.alert("Check your email", "We sent you an email with password reset instructions.")
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to send reset email")
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setSecureTextEntry(!secureTextEntry)
  }

  const toggleAuthMode = () => {
    router.push(`/auth?mode=${isSignUp ? "signin" : "signup"}`)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { backgroundColor: isDarkMode ? "#121212" : "#f8fafc" }]}>
          <StatusBar
            barStyle={isDarkMode ? "light-content" : "dark-content"}
            backgroundColor={isDarkMode ? "#121212" : "#f8fafc"}
          />

          {/* Network Status Banner */}
          {!connectionStatus && (
            <View style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={18} color="white" />
              <Text style={styles.offlineBannerText}>You are offline</Text>
            </View>
          )}

          {/* Header logo and branding */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: logoScale }
              ],
              height: keyboardVisible ? 60 : 100,
              marginTop: keyboardVisible ? 10 : 30,
              marginBottom: keyboardVisible ? 10 : 20,
            }}
          >
            <View style={styles.logoContainer}>
              <Image
                style={[
                  styles.image,
                  { height: keyboardVisible ? 40 : 60, width: keyboardVisible ? 240 : 330, top: keyboardVisible ? 0 : 45 }
                ]}
                source={require("@/icons/adaptive-icon.png")}
                contentFit="cover"
              />
            </View>
          </Animated.View>

          {/* Form fields */}
          <Animated.View style={[
            styles.formContainer, 
            { opacity: fadeAnim }
          ]}>
            
            <Text style={[
              styles.tagline, 
              { 
                color: isDarkMode ? "#e0e0e0" : "#374151",
                fontSize: keyboardVisible ? 20 : 26,
                marginBottom: keyboardVisible ? 15 : 30,
              }
            ]}>
              {isSignUp ? "Create your account" : "Welcome back"}
            </Text>
            
            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? "#e0e0e0" : "#374151" }]}>
                  Full Name
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    { backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff" },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#4F46E5"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: isDarkMode ? "#ffffff" : "#111827" }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={isDarkMode ? "#a0a0a0" : "#9ca3af"}
                    value={name}
                    onChangeText={setName}
                    returnKeyType="next"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDarkMode ? "#e0e0e0" : "#374151" }]}>
                Email
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff" },
                ]}
              >
                <Ionicons name="mail-outline" size={20} color="#4F46E5" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: isDarkMode ? "#ffffff" : "#111827" }]}
                  placeholder="Enter your email"
                  placeholderTextColor={isDarkMode ? "#a0a0a0" : "#9ca3af"}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDarkMode ? "#e0e0e0" : "#374151" }]}>
                Password
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: isDarkMode ? "#1e1e1e" : "#ffffff" },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#4F46E5"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: isDarkMode ? "#ffffff" : "#111827" }]}
                  placeholder="Enter your password"
                  placeholderTextColor={isDarkMode ? "#a0a0a0" : "#9ca3af"}
                  secureTextEntry={secureTextEntry}
                  value={password}
                  onChangeText={setPassword}
                  returnKeyType="done"
                  onSubmitEditing={isSignUp ? handleSignUp : handleSignIn}
                />
                <TouchableOpacity onPress={togglePasswordVisibility} style={styles.passwordToggle}>
                  <Ionicons
                    name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={isDarkMode ? "#a0a0a0" : "#6b7280"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {!isSignUp && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: '#4F46E5' }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton, 
                { 
                  backgroundColor: connectionStatus ? "#4F46E5" : "#a5a5a5",
                  opacity: connectionStatus ? 1 : 0.8
                }
              ]}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={isLoading || !connectionStatus}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? "Creating Account..." : "Signing In..."}
                </Text>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {isSignUp ? "Create Account" : "Sign In"}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Bottom text */}
          <View style={[
            styles.bottomContainer,
            { marginTop: keyboardVisible ? 10 : 20 }
          ]}>
            <Text style={[styles.bottomText, { color: isDarkMode ? "#a0a0a0" : "#6b7280" }]}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode}>
              <Text style={[styles.bottomLink, { color: "#4F46E5" }]}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: 300,
    height: 60,
  },
  formContainer: {
    width: "100%",
    maxWidth: 350,
  },
  tagline: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    height: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  inputIcon: {
    paddingLeft: 16,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingLeft: 12,
    paddingRight: 12,
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  primaryButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  bottomContainer: {
    flexDirection: "row",
    marginTop: 30,
    marginBottom: 20,
  },
  bottomText: {
    fontSize: 14,
    marginRight: 4,
  },
  bottomLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  passwordToggle: {
    padding: 10,
  },
  offlineBanner: {
    backgroundColor: "#f97316",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 350,
  },
  offlineBannerText: {
    color: "white",
    fontWeight: "500",
    marginLeft: 6,
  },
});

export default AuthScreen;