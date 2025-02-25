import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Dimensions, 
  Animated 
} from 'react-native';
import { Svg, Circle, Rect, Path, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const welcomeData = [
  {
    id: '1',
    title: 'Welcome to Taskly',
    description: 'The smarter way to manage your tasks and boost productivity',
    buttonText: 'Next',
  },
  {
    id: '2',
    title: 'Stay Organized',
    description: 'Create tasks, set priorities, and track your progress with ease',
    buttonText: 'Next',
  },
  {
    id: '3',
    title: 'Get Started',
    description: 'Join thousands of users who improved their productivity with Taskly',
    buttonText: 'Get Started',
  },
];

const WelcomeScreen = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const renderIllustration = (index) => {
    switch (index) {
      case 0:
        return (
          <View style={styles.illustrationContainer}>
            <View style={[styles.circle, { backgroundColor: '#e6f0ff' }]}>
              <View style={styles.taskIcon}>
                <View style={[styles.checkbox, styles.checkedBox]}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
                <View style={styles.taskLine} />
                <View style={[styles.taskLine, { width: 80 }]} />
              </View>
            </View>
            <View style={styles.taskRow}>
              <View style={styles.checkbox} />
              <View style={styles.taskLineContainer}>
                <View style={styles.taskLine} />
                <View style={[styles.taskLine, { width: 70 }]} />
              </View>
            </View>
            <View style={styles.taskRow}>
              <View style={styles.checkbox} />
              <View style={styles.taskLineContainer}>
                <View style={styles.taskLine} />
                <View style={[styles.taskLine, { width: 90 }]} />
              </View>
            </View>
          </View>
        );
      case 1:
        return (
          <View style={styles.illustrationContainer}>
            <Svg width="200" height="200" viewBox="0 0 200 200">
              <Circle cx="100" cy="100" r="60" fill="#e6f0ff" />
              <Rect x="70" y="80" width="60" height="80" rx="5" fill="#4a6cfa" />
              <Rect x="80" y="90" width="40" height="8" rx="4" fill="white" />
              <Rect x="80" y="105" width="40" height="8" rx="4" fill="white" />
              <Rect x="80" y="120" width="25" height="8" rx="4" fill="white" />
              <Circle cx="140" cy="70" r="25" fill="#ff7e6b" />
              <SvgText x="140" y="76" fontSize="20" fill="white" textAnchor="middle">3</SvgText>
            </Svg>
          </View>
        );
      case 2:
        return (
          <View style={styles.illustrationContainer}>
            <Svg width="200" height="200" viewBox="0 0 200 200">
              <Circle cx="100" cy="100" r="60" fill="#e6f0ff" />
              <Path d="M70,100 L90,120 L130,80" stroke="#4a6cfa" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Circle cx="160" cy="60" r="20" fill="#4BE1AB" />
              <Rect x="70" y="140" width="60" height="10" rx="5" fill="#4a6cfa" opacity="0.5" />
            </Svg>
          </View>
        );
      default:
        return null;
    }
  };

  const handleNext = () => {
    if (currentIndex < welcomeData.length - 1) {
      flatListRef.current.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      // Complete onboarding
      completeOnboarding();
    }
  };

  const handleSkip = async () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      // Mark onboarding as completed
      await AsyncStorage.setItem('@taskly_onboarding_completed', 'true');
      // Navigate to the main app (you'll need to adjust this based on your navigation structure)
      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const renderItem = ({ item, index }) => {
    return (
      <View style={styles.slide}>
        {renderIllustration(index)}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{item.buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotContainer}>
        {welcomeData.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 20, 8],
            extrapolate: 'clamp',
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          
          const backgroundColor = scrollX.interpolate({
            inputRange,
            outputRange: ['#ccc', '#4a6cfa', '#ccc'],
            extrapolate: 'clamp',
          });
          
          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      
      <FlatList
        ref={flatListRef}
        data={welcomeData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(
            event.nativeEvent.contentOffset.x / width
          );
          setCurrentIndex(newIndex);
        }}
        scrollEventThrottle={16}
      />
      
      {renderDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  illustrationContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  taskIcon: {
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#4a6cfa',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#4a6cfa',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskLine: {
    width: 100,
    height: 3,
    backgroundColor: '#ddd',
    marginTop: 5,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  taskLineContainer: {
    marginLeft: 10,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 200,
    width: '100%',
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 100,
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#4a6cfa',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WelcomeScreen;