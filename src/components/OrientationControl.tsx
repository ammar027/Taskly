import React, { useEffect, useState } from 'react';
import { Dimensions, Platform, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

export function useOrientationControl() {
  const window = useWindowDimensions();
  
  useEffect(() => {
    const checkDeviceType = () => {
      const { width, height } = window;
      const maxDimension = Math.max(width, height);
      return maxDimension >= 868; // Common threshold for tablets
    };
    
    const isTablet = checkDeviceType();
    
    const lockOrientation = async () => {
      if (!isTablet) {
        // Lock to portrait for phones
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      } else {
        // Allow any orientation for tablets
        await ScreenOrientation.unlockAsync();
      }
    };

    lockOrientation();
    
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, [window]); // Re-check if window dimensions change
}

// New hook to get current screen details
export function useScreenDetails() {
  const window = useWindowDimensions();
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isTablet, setIsTablet] = useState(false);
  
  useEffect(() => {
    // Determine current orientation
    setOrientation(window.width > window.height ? 'landscape' : 'portrait');
    
    // Determine if tablet based on screen size
    const maxDimension = Math.max(window.width, window.height);
    setIsTablet(maxDimension >= 768);
    
    // Listen for orientation changes
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setOrientation(window.width > window.height ? 'landscape' : 'portrait');
    });
    
    return () => {
      subscription.remove();
    };
  }, [window]);
  
  return {
    isTablet,
    orientation,
    isTabletLandscape: isTablet && orientation === 'landscape',
    width: window.width,
    height: window.height
  };
}