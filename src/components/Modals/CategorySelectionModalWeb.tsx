import React, {useEffect, useState} from 'react'
import {View, Text, StyleSheet, Modal, FlatList, Pressable, TouchableOpacity, TouchableWithoutFeedback} from 'react-native'
import {Ionicons} from '@expo/vector-icons'
import {useTheme} from '@/components/ThemeContext'

// Import categories from the native file to keep them in sync
import {CATEGORIES} from './categoriessection'

// Web-specific implementation with improved responsive design
const CategorySelectionModalWeb = ({visible, onClose, onSelectCategory, currentCategory}) => {
  const {isDarkMode} = useTheme()

  // Standard React state for animations
  const [isVisible, setIsVisible] = useState(false)
  const [opacity, setOpacity] = useState(0)
  const [scale, setScale] = useState(0.9)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  // Create theme-based colors
  const colors = {
    modalBackground: isDarkMode ? '#1E1E1E' : '#FFFFFF',
    modalOverlay: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    text: {
      primary: isDarkMode ? '#F1F5F9' : '#1E293B',
      secondary: isDarkMode ? '#94A3B8' : '#64748B'
    },
    border: isDarkMode ? 'rgb(123, 123, 123)' : '#E2E8F0',
    itemBackground: isDarkMode ? '#0F172A' : '#FFFFFF',
    pressedState: isDarkMode ? 'rgb(66, 66, 66)' : 'rgba(0, 0, 0, 0.05)',
    closeIcon: isDarkMode ? '#94A3B8' : '#64748B'
  }

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    // Handle visibility with standard React state
    if (visible) {
      setIsVisible(true)
      // Reset initial values
      setOpacity(0)
      setScale(0.9)

      // Use requestAnimationFrame for smoother animation
      requestAnimationFrame(() => {
        setOpacity(1)
        setScale(1)
      })
    } else {
      setOpacity(0)
      setScale(0.9)

      // Hide after animation completes
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [visible])

  const handleSelectCategory = category => {
    onSelectCategory(category)
    onClose()
  }

  // Find the current category object if we have a name
  const selectedCategory = currentCategory ? CATEGORIES.find(cat => cat.name === currentCategory) || null : null

  // Get category item background color based on theme
  const getCategoryItemBackground = color => {
    return isDarkMode ? `${color}15` : `${color}10`
  }

  // Calculate responsive values
  const isSmallScreen = windowWidth < 768
  const isMediumScreen = windowWidth >= 768 && windowWidth < 1024

  const getModalWidth = () => {
    if (isSmallScreen) return '95%'
    if (isMediumScreen) return '80%'
    return '550px' // Max width for larger screens
  }

  const getNumColumns = () => {
    return isSmallScreen ? 1 : 2
  }

  // Define dynamic styles for web animations
  const overlayStyle = {
    backgroundColor: `rgba(0, 0, 0, ${isDarkMode ? opacity * 0.7 : opacity * 0.5})`,
    opacity: opacity,
    transition: 'opacity 300ms ease-out'
  }

  const contentStyle = {
    transform: [{scale: scale}],
    opacity: opacity,
    backgroundColor: colors.modalBackground,
    transition: 'all 300ms ease-out',
    width: getModalWidth()
  }

  if (!isVisible) return null

  return (
    <Modal visible={isVisible} transparent={true} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, overlayStyle]}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, contentStyle]}>
              <View style={[styles.modalHeader, {borderBottomColor: colors.border}]}>
                <Text style={[styles.modalTitle, {color: colors.text.primary}]}>Select Category</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{top: 10, right: 10, bottom: 10, left: 10}} aria-label="Close dialog">
                  <Ionicons name="close" size={24} color={colors.closeIcon} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={CATEGORIES}
                keyExtractor={item => item.id}
                numColumns={getNumColumns()}
                key={`columns-${getNumColumns()}`} // Force re-render when columns change
                contentContainerStyle={styles.categoriesGrid}
                columnWrapperStyle={getNumColumns() > 1 ? styles.columnWrapper : undefined}
                renderItem={({item, index}) => {
                  // Add a small delay to each item for a staggered entry effect
                  const itemStyle = {
                    opacity: opacity,
                    transform: [{translateY: opacity * 0}],
                    transition: `all 300ms ease-out ${index * 30}ms`
                  }

                  const itemWidth = getNumColumns() === 1 ? '100%' : '48%'

                  return (
                    <View style={[styles.categoryItemContainer, {width: itemWidth}, itemStyle]}>
                      <Pressable style={({pressed, hovered}) => [styles.categoryItem, {backgroundColor: getCategoryItemBackground(item.color)}, isDarkMode && {borderColor: `${item.color}30`}, selectedCategory?.id === item.id && styles.selectedCategoryItem, selectedCategory?.id === item.id && {borderColor: item.color}, pressed && styles.categoryItemPressed, hovered && {borderColor: item.color, opacity: 0.95}]} onPress={() => handleSelectCategory(item)} aria-label={`Category ${item.name}`} role="button">
                        <View style={[styles.categoryIcon, {backgroundColor: item.color}]}>
                          <Ionicons name={item.icon} size={20} color="#ffffff" />
                        </View>
                        <Text style={[styles.categoryName, {color: colors.text.primary}]}>{item.name}</Text>
                        {selectedCategory?.id === item.id && (
                          <View style={styles.checkmarkContainer}>
                            <Ionicons name="checkmark-circle" size={20} color={item.color} />
                          </View>
                        )}
                      </Pressable>
                    </View>
                  )
                }}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)'
  },
  modalContent: {
    maxHeight: '85vh',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.2)',
    maxWidth: '550px'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  // Category grid styles
  categoriesGrid: {
    padding: 1,
    paddingBottom: 14
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20
  },
  categoryItemContainer: {
    marginBottom: 26
  },
  categoryItem: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 110,
    borderWidth: 1,
    borderColor: 'transparent',
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  },
  categoryItemPressed: {
    opacity: 0.8,
    transform: [{scale: 0.98}]
  },
  selectedCategoryItem: {
    borderWidth: 2
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)'
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 8,
    right: 8
  }
})

export default CategorySelectionModalWeb
