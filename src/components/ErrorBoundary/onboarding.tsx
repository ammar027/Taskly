import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet, Pressable, TouchableOpacity, OpaqueColorValue } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withSequence,
  Easing,
  interpolate,
  Extrapolate,
  runOnJS,
  useAnimatedReaction
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Theme data with Taskly features highlighted and updated theme colors
const PAGES = [
  { 
    id: 1, 
    title: 'Welcome to Taskly', 
    description: 'The intelligent task management app designed to make your life easier.',
    colors: ['#FFFFFF', '#F9FAFB'],
    accentColor: '#4F46E5',
    icon: 'checkbox',
    interactionType: 'swipe'
  },
  { 
    id: 2, 
    title: 'Voice to Text', 
    description: 'Simply speak your tasks. Taskly transcribes and organizes them automatically.',
    colors: ['#FFFFFF', '#F9FAFB'],
    accentColor: '#4F46E5',
    icon: 'mic',
    interactionType: 'press'
  },
  { 
    id: 3, 
    title: 'Smart Assistant', 
    description: 'Just say "Hey Google, open Taskly" and start speaking your task.',
    colors: ['#FFFFFF', '#F9FAFB'],
    accentColor: '#4F46E5',
    icon: 'logo-google',
    interactionType: 'press'
  },
  { 
    id: 4, 
    title: 'Reminders & Categories', 
    description: 'Get timely notifications and organize tasks by categories that matter to you.',
    colors: ['#FFFFFF', '#F9FAFB'],
    accentColor: '#4F46E5',
    icon: 'notifications',
    interactionType: 'tap'
  }
];

// Generate particles with memoization to ensure stable references
const generateParticles = (count: number) => {
  return Array(count).fill(0).map(() => ({
    x: useSharedValue(Math.random() * width),
    y: useSharedValue(Math.random() * height),
    size: useSharedValue(Math.random() * 6 + 3),
    opacity: useSharedValue(Math.random() * 0.5 + 0.2),
    initialX: Math.random() * width,
    initialY: Math.random() * height,
  }));
};

const TasklyOnboarding = ({ onComplete }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const translateX = useSharedValue(0);
  const currentIndex = useSharedValue(0);
  const scale = useSharedValue(1);
  const touchX = useSharedValue(width / 2);
  const touchY = useSharedValue(height / 2);
  const touchActive = useSharedValue(0);
  
  // Create particles only once during initialization
  const particles = useRef(generateParticles(12)).current;
  
  // Simplified useAnimatedReaction with minimal dependencies
  useAnimatedReaction(
    () => currentIndex.value,
    (current, previous) => {
      if (current !== previous && previous !== null) {
        runOnJS(setActiveIndex)(current);
      }
    }
  );

  // Simplified animateParticles function with useCallback
  const animateParticles = useCallback(() => {
    const now = Date.now();
    particles.forEach((particle, index) => {
      // Only animate particles for the first page or when needed
      if (index % 3 === 0) {
        particle.x.value = withTiming(
          particle.initialX + (Math.random() * 80 - 40),
          { duration: 4000 }
        );
        particle.y.value = withTiming(
          particle.initialY + (Math.random() * 80 - 40),
          { duration: 4000 }
        );
        particle.opacity.value = withTiming(
          Math.random() * 0.5 + 0.2,
          { duration: 3000 }
        );
      }
    });
  }, []); // Empty dependency array for stability

  // Stable useEffect
  useEffect(() => {
    const interval = setInterval(animateParticles, 4000);
    return () => clearInterval(interval);
  }, [animateParticles]); // Stable dependency

  // Pan gesture for swiping between pages
  const panGesture = Gesture.Pan()
    .onStart(() => {
      touchActive.value = withTiming(1, { duration: 300 });
    })
    .onUpdate((event) => {
      translateX.value = -currentIndex.value * width + event.translationX;
      touchX.value = event.x;
      touchY.value = event.y;
    })
    .onEnd((event) => {
      touchActive.value = withTiming(0, { duration: 800 });
      
      // Determine if swipe should change page
      if (event.translationX < -width * 0.2 && currentIndex.value < PAGES.length - 1) {
        currentIndex.value = Math.min(PAGES.length - 1, currentIndex.value + 1);
      } else if (event.translationX > width * 0.2 && currentIndex.value > 0) {
        currentIndex.value = Math.max(0, currentIndex.value - 1);
      }
      
      // Spring animation with optimized parameters
      translateX.value = withSpring(-currentIndex.value * width, {
        damping: 20,
        stiffness: 90,
        mass: 1,
        overshootClamping: false,
      });
    });

  // Tap gesture for interactive elements
  const tapGesture = Gesture.Tap()
    .onBegin((event) => {
      touchX.value = event.x;
      touchY.value = event.y;
      touchActive.value = withTiming(1, { duration: 100 });
      
      // Simple scale animation only
      scale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1, { duration: 150 })
      );
    })
    .onFinalize(() => {
      touchActive.value = withTiming(0, { duration: 400 });
    });

  // Combined gesture
  const compositeGesture = Gesture.Simultaneous(panGesture, tapGesture);

  // Simplified feature demo callbacks
  const handleFeatureDemo = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.9, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
    
    touchActive.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0, { duration: 500 })
    );
  }, []);

  // Simplified page rendering with minimal animations
  const renderPage = useCallback((page: { accentColor: string | OpaqueColorValue | undefined; interactionType: any; id: React.Key | null | undefined; colors: readonly [string, string, ...string[]]; icon: string | undefined; title: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; description: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined; }, index: number) => {
    // Touch ripple effect - optimized
    const rippleStyle = useAnimatedStyle(() => {
      return {
        width: touchActive.value * 180,
        height: touchActive.value * 180,
        borderRadius: 90,
        backgroundColor: `${page.accentColor}40`,
        position: 'absolute',
        left: touchX.value - 90,
        top: touchY.value - 90,
        opacity: touchActive.value * 0.5,
        transform: [{ scale: interpolate(
          touchActive.value,
          [0, 1],
          [0.5, 1.2],
          Extrapolate.CLAMP
        )}],
      };
    });

    // Pre-allocate needed particles only for visible page
    const particlesToShow = index === activeIndex ? 8 : 0;

    // Get interaction prompt text
    const getInteractionPrompt = () => {
      switch (page.interactionType) {
        case 'swipe':
          return "Swipe to explore";
        case 'press':
          return "Tap to experience";
        case 'tap':
          return "Tap to preview";
        default:
          return null;
      }
    };

    return (
      <View key={page.id} style={styles.pageContainer}>
        <LinearGradient
          colors={page.colors}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Only render particles for the active page */}
        {particles.slice(0, particlesToShow).map((particle, i) => {
          const particleStyle = useAnimatedStyle(() => {
            return {
              position: 'absolute',
              left: particle.x.value,
              top: particle.y.value,
              width: particle.size.value,
              height: particle.size.value,
              borderRadius: particle.size.value / 2,
              backgroundColor: page.accentColor,
              opacity: particle.opacity.value,
            };
          });
          
          return <Animated.View key={i} style={particleStyle} />;
        })}
        
        {/* Touch ripple effect - only render when active */}
        {index === activeIndex && <Animated.View style={rippleStyle} />}
        
        {/* Content container with static positioning */}
        <View style={styles.contentContainer}>
          {/* Feature icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={page.icon} size={50} color={page.accentColor} />
          </View>
          
          <Text style={[styles.title, { color: '#111827' }]}>
            {page.title}
          </Text>
          
          <Text style={[styles.description, { color: '#4B5563' }]}>
            {page.description}
          </Text>
          
          <View style={[styles.interactionPrompt, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
            <Text style={[styles.interactionText, { color: '#4F46E5' }]}>{getInteractionPrompt()}</Text>
          </View>
          
          {/* Interactive feature demo */}
          <TouchableOpacity 
            style={[styles.interactiveElement, { 
              borderColor: page.accentColor,
              backgroundColor: 'rgba(79, 70, 229, 0.05)'
            }]}
            onPress={handleFeatureDemo}
          >
            <Text style={[styles.interactiveElementText, { color: '#4F46E5' }]}>
              Try It
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [activeIndex, handleFeatureDemo]);

  // Custom pagination indicator (simplified)
  const renderPagination = useCallback(() => {
    return (
      <View style={styles.paginationContainer}>
        {PAGES.map((_, index) => {
          const dotAnimatedStyle = useAnimatedStyle(() => {
            const isActive = index === currentIndex.value;
            const dotWidth = isActive ? 24 : 8;
              
            return {
              width: dotWidth,
              backgroundColor: isActive ? '#4F46E5' : 'rgba(79, 70, 229, 0.3)',
            };
          });
          
          return (
            <Pressable
              key={index}
              onPress={() => {
                currentIndex.value = index;
                translateX.value = withSpring(-index * width);
              }}
            >
              <Animated.View style={[styles.paginationDot, dotAnimatedStyle]} />
            </Pressable>
          );
        })}
      </View>
    );
  }, []);

  // Button to complete onboarding (simplified)
  const renderButton = useCallback(() => {
    return (
      <View style={styles.buttonContainer}>
        {activeIndex === PAGES.length - 1 ? (
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={onComplete}
          >
            <View style={[styles.button, { backgroundColor: '#4F46E5' }]}>
              <Text style={styles.buttonText}>
                Get Started
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onComplete}
          >
            <Text style={[styles.skipText, { color: '#4F46E5' }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [activeIndex, onComplete]);

  return (
    <GestureDetector gesture={compositeGesture}>
      <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        <Animated.View 
          style={[
            styles.carouselContainer,
            { transform: [{ translateX }] }
          ]}
        >
          {PAGES.map(renderPage)}
        </Animated.View>
        
        {renderPagination()}
        {renderButton()}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  carouselContainer: {
    flex: 1,
    flexDirection: 'row',
    width: width * PAGES.length,
  },
  pageContainer: {
    width,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 30,
    paddingBottom: 50,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 18,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 30,
    maxWidth: '85%',
  },
  interactionPrompt: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 25,
  },
  interactionText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 16,
  },
  interactiveElement: {
    backgroundColor: 'rgba(79, 70, 229, 0.05)',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  interactiveElementText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
  },
  getStartedButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TasklyOnboarding;