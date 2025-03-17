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

const USER_SESSION_KEY = "user_session"
const DEFAULT_AUTH_MODE = "signup" // Set default mode to signup for first visit

const AuthScreen = () => {
  const { isDarkMode } = useTheme()
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

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus()

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

  const checkAuthStatus = async () => {
    try {
      const session = await AsyncStorage.getItem(USER_SESSION_KEY)

      if (session) {
        const sessionData = JSON.parse(session)
        const { data, error } = await supabase.auth.getUser(sessionData.access_token)

        if (data?.user && !error) {
          router.replace("/(tabs)")
        }
      }
    } catch (error) {
      console.error("Error checking auth status:", error)
    }
  }

  const saveSession = async (session) => {
    try {
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(session))
    } catch (error) {
      console.error("Error saving session:", error)
    }
  }

  const handleSignIn = async () => {
    Keyboard.dismiss()
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password")
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      await saveSession(data.session)
      router.replace("/record/new")
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

    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      })

      if (error) throw error

      if (data.session) {
        await saveSession(data.session)
        router.replace("/record/new")
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

            {/* {!isSignUp && (
              <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: '#4F46E5' }]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            )} */}

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: "#4F46E5" }]}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={isLoading}
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
    paddingHorizontal: 26,
    paddingTop: 30,
    paddingBottom: 30,
    justifyContent: "space-between",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: 330,
    alignSelf: "center",
    justifyContent: 'center',
  },
  tagline: {
    fontWeight: "700",
  },
  formContainer: {
    width: "100%",
    flex: 1,
    justifyContent:'center'
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: 12,
    borderWidth: 0.3,
    borderColor: "grey",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    fontSize: 16,
  },
  passwordToggle: {
    padding: 12,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    flexDirection: "row",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 15,
  },
  bottomText: {
    fontSize: 14,
    marginRight: 4,
  },
  bottomLink: {
    fontSize: 14,
    fontWeight: "600",
  },
})

export default AuthScreen