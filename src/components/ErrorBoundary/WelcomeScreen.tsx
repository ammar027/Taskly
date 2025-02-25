import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Dimensions, 
  TouchableOpacity, 
  Animated, 
  PanResponder,
  SafeAreaView
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const ACCENT_COLOR = '#4F46E5'; // The primary accent color

// Button component for "Skip" and "Get Started" buttons
const Button = ({ label, primary, onPress }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        primary && { backgroundColor: 'white' }
      ]}
      onPress={onPress}
    >
      <Text 
        style={[
          styles.buttonText, 
          primary && { color: ACCENT_COLOR }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// Slide component for each onboarding page
const Slide = ({ title, description, color, icon, iconType, index, count }) => {
  const renderIcon = () => {
    switch (iconType) {
      case 'Ionicons':
        return <Ionicons name={icon} size={120} color="white" />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={icon} size={120} color="white" />;
      case 'FontAwesome5':
        return <FontAwesome5 name={icon} size={120} color="white" />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.slide, { backgroundColor: color }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.slideContent}>
          <View style={styles.iconContainer}>
            {renderIcon()}
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          
          <View style={styles.pagination}>
            {Array.from({ length: count }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.paginationDot,
                  { opacity: i === index ? 1 : 0.5 }
                ]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

// A simpler version of the curved transition using basic animation
const Transition = ({ position, nextColor }) => {
  // Create path for a simple curved shape
  const curve = `
    M 0 0
    Q ${width/2} ${height*0.3}, ${width} 0
    L ${width} ${height}
    Q ${width/2} ${height*0.7}, 0 ${height}
    Z
  `;

  const animatedStyle = {
    transform: [
      { translateX: position }
    ]
  };

  return (
    <Animated.View style={[styles.transitionContainer, animatedStyle]}>
      <Svg width={width} height={height}>
        <Path d={curve} fill={nextColor} />
      </Svg>
      <View style={styles.arrowContainer}>
        <Ionicons name="chevron-back" size={30} color="white" />
      </View>
    </Animated.View>
  );
};

// Main component
const OnboardingScreen = () => {
  const [index, setIndex] = useState(0);
  const slidePosition = useRef(new Animated.Value(width)).current;
  
  // Slides data
  const slides = [
    {
      title: 'Voice Task Entry',
      description: 'Simply say "Hey Google, open Taskly" and speak your task. It will be automatically saved as text.',
      color: ACCENT_COLOR,
      icon: 'mic',
      iconType: 'Ionicons',
    },
    {
      title: 'Smart Categories',
      description: 'Organize your tasks into categories like Work, Personal, Projects, and more for better productivity.',
      color: '#6366F1',
      icon: 'format-list-bulleted',
      iconType: 'MaterialCommunityIcons',
    },
    {
      title: 'Smart Reminders',
      description: 'Set up categorized reminders with timely notifications so you never miss anything important.',
      color: '#818CF8',
      icon: 'bell',
      iconType: 'FontAwesome5',
    },
  ];

  // Create PanResponder for handling swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        // Only handle left-to-right gestures starting from the right edge
        if (gesture.dx < 0 && gesture.moveX < width - 50) {
          return;
        }
        
        // Limit the drag to stay within bounds
        if (gesture.dx <= 0) {
          slidePosition.setValue(width + gesture.dx);
        }
      },
      onPanResponderRelease: (event, gesture) => {
        // If dragged far enough to the left, go to the next slide
        if (gesture.dx < -width / 3) {
          goToNextSlide();
        } else {
          // Otherwise, animate back to the start position
          Animated.spring(slidePosition, {
            toValue: width,
            useNativeDriver: true,
            friction: 8,
            tension: 40,
          }).start();
        }
      },
    })
  ).current;

  const goToNextSlide = () => {
    if (index < slides.length - 1) {
      // Animate the transition complete
      Animated.timing(slidePosition, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Reset for the next transition
        setIndex(prevIndex => prevIndex + 1);
        slidePosition.setValue(width);
      });
    }
  };

  const skipToLastSlide = () => {
    setIndex(slides.length - 1);
  };

  const startApp = () => {
    console.log('Starting the app!');
    // Navigation logic would go here
  };

  const getNextColor = () => {
    if (index < slides.length - 1) {
      return slides[index + 1].color;
    }
    return slides[index].color;
  };

  return (
    <View style={styles.container}>
      {/* Current slide */}
      <Slide 
        {...slides[index]} 
        index={index} 
        count={slides.length} 
      />
      
      {/* Transition effect */}
      <Transition 
        position={slidePosition} 
        nextColor={getNextColor()}
      />
      
      {/* Gesture handler area */}
      <View
        style={styles.gestureArea}
        {...panResponder.panHandlers}
      />
      
      {/* Button to skip or get started */}
      <View style={styles.buttonContainer}>
        {index < slides.length - 1 ? (
          <Button 
            label="Skip" 
            onPress={skipToLastSlide} 
          />
        ) : (
          <Button 
            label="Get Started" 
            primary 
            onPress={startApp} 
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    ...StyleSheet.absoluteFillObject,
  },
  slideContent: {
    width: width * 0.8,
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    height: 180,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
    marginHorizontal: 5,
  },
  transitionContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: width,
    height: height,
  },
  arrowContainer: {
    position: 'absolute',
    left: 20,
    top: height / 2 - 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gestureArea: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 50,
    height: height,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;