import React, { useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Pressable,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated"
import { useTheme } from "@/components/ThemeContext"

// Define categories with improved accessibility and visual hierarchy
export const CATEGORIES = [
  { id: "1", name: "Work", icon: "briefcase", color: "#4338CA", gradient: ["#4338CA", "#6366F1"] },
  { id: "2", name: "Personal", icon: "person", color: "#047857", gradient: ["#047857", "#10B981"] },
  { id: "3", name: "Ideas", icon: "bulb", color: "#BE185D", gradient: ["#BE185D", "#EC4899"] },
  {
    id: "4",
    name: "Tasks",
    icon: "checkmark-circle",
    color: "#B45309",
    gradient: ["#B45309", "#F59E0B"],
  },
  { id: "5", name: "Projects", icon: "folder", color: "#6D28D9", gradient: ["#6D28D9", "#8B5CF6"] },
  { id: "6", name: "Meetings", icon: "people", color: "#9F1239", gradient: ["#9F1239", "#E11D48"] },
]

// Animated Pressable component
const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// Improved Category Selection Modal with animations and better spacing + dark mode
export const CategorySelectionModal = ({ visible, onClose, onSelectCategory, currentCategory }) => {
  const { isDarkMode } = useTheme()
  const fadeAnim = useSharedValue(0)

  // Create theme-based colors
  const colors = {
    modalBackground: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    modalOverlay: isDarkMode ? '1E1E1E' : 'rgba(0, 0, 0, 0.5)',
    text: {
      primary: isDarkMode ? '#F1F5F9' : '#1E293B',
      secondary: isDarkMode ? '#94A3B8' : '#64748B',
    },
    border: isDarkMode ? 'rgb(123, 123, 123)' : '#E2E8F0',
    itemBackground: isDarkMode ? '#0F172A' : '#FFFFFF',
    pressedState: isDarkMode ? 'rgb(66, 66, 66)' : 'rgba(0, 0, 0, 0.05)',
    closeIcon: isDarkMode ? '#94A3B8' : '#64748B',
  }

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withSpring(1, { damping: 15 })
    } else {
      fadeAnim.value = withSpring(0)
    }
  }, [visible])

  const handleSelectCategory = (category) => {
    onSelectCategory(category)
    onClose()
  }

  // Find the current category object if we have a name
  const selectedCategory = currentCategory
    ? CATEGORIES.find((cat) => cat.name === currentCategory) || null
    : null

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      backgroundColor: `rgba(0, 0, 0, ${isDarkMode ? fadeAnim.value * 0.7 : fadeAnim.value * 0.5})`,
    }
  })

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: 0.9 + fadeAnim.value * 0.1 }],
      opacity: fadeAnim.value,
      backgroundColor: colors.modalBackground,
    }
  })

  // Get category item background color based on theme
  const getCategoryItemBackground = (color) => {
    return isDarkMode ? `${color}15` : `${color}10` 
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none" // Using our custom animation instead
      statusBarTranslucent={true}
      onDismiss={() => StatusBar.setHidden(false, "fade")}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.modalOverlay, animatedOverlayStyle]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, animatedContentStyle]}>
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                  Select Category
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.closeIcon} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={CATEGORIES}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.categoriesGrid}
                columnWrapperStyle={styles.columnWrapper}
                renderItem={({ item, index }) => (
                  <Animated.View
                    entering={FadeInUp.delay(index * 50).springify()}
                    style={styles.categoryItemContainer}
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.categoryItem,
                        { backgroundColor: getCategoryItemBackground(item.color) },
                        isDarkMode && { borderColor: `${item.color}30` },
                        selectedCategory?.id === item.id && styles.selectedCategoryItem,
                        selectedCategory?.id === item.id && { borderColor: item.color },
                        pressed && styles.categoryItemPressed,
                      ]}
                      onPress={() => handleSelectCategory(item)}
                      android_ripple={{ 
                        color: isDarkMode ? `${item.color}30` : `${item.color}20`,
                        borderless: false 
                      }}
                    >
                      <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
                        <Ionicons name={item.icon} size={20} color="#ffffff" />
                      </View>
                      <Text style={[styles.categoryName, { color: colors.text.primary }]}>
                        {item.name}
                      </Text>
                      {selectedCategory?.id === item.id && (
                        <View style={styles.checkmarkContainer}>
                          <Ionicons name="checkmark-circle" size={20} color={item.color} />
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                )}
              />
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxHeight: "70%",
    borderRadius: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
  },

  // Category grid styles
  categoriesGrid: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  categoryItemContainer: {
    width: "48%",
    marginBottom: 12,
  },
  categoryItem: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    height: 110,
    borderWidth: 1,
    borderColor: "transparent",
  },
  categoryItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  selectedCategoryItem: {
    borderWidth: 2,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  checkmarkContainer: {
    position: "absolute",
    top: 8,
    right: 8,
  },
})

export default CategorySelectionModal;