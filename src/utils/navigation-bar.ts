// src/utils/navigation-bar.ts
import { Platform } from 'react-native';

// Create a web-compatible NavigationBar polyfill
const NavigationBarWeb = {
  setBackgroundColorAsync: async (color: string) => {
    console.log('Web NavigationBar: setBackgroundColorAsync called with', color);
    return Promise.resolve();
  },
  setButtonStyleAsync: async (style: string) => {
    console.log('Web NavigationBar: setButtonStyleAsync called with', style);
    return Promise.resolve();
  },
  setVisibilityAsync: async (visibility: string) => {
    console.log('Web NavigationBar: setVisibilityAsync called with', visibility);
    return Promise.resolve();
  },
  setPositionAsync: async (position: string) => {
    console.log('Web NavigationBar: setPositionAsync called with', position);
    return Promise.resolve();
  },
  addVisibilityListener: (callback: () => void) => {
    console.log('Web NavigationBar: addVisibilityListener called');
    // Return an object with a remove method to match the native API
    return {
      remove: () => {
        console.log('Web NavigationBar: visibility listener removed');
      }
    };
  }
};

// Export the appropriate version based on platform
const NavigationBarModule = Platform.OS === 'web' 
  ? NavigationBarWeb 
  : require('expo-navigation-bar');

export default NavigationBarModule;