// import React, { useState, useEffect, useRef } from 'react';
// import { View, Text, StyleSheet, AppState, Platform } from 'react-native';
// import { PorcupineManager, BuiltInKeywords } from '@picovoice/porcupine-react-native';
// import { Audio } from 'expo-av';
// import * as Notifications from 'expo-notifications';
// import * as BackgroundFetch from 'expo-background-fetch';
// import * as TaskManager from 'expo-task-manager';

// const BACKGROUND_FETCH_TASK = 'background-wake-word';

// // Register the background task
// TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
//   try {
//     console.log('Background task running');
//     return BackgroundFetch.BackgroundFetchResult.NewData;
//   } catch (error) {
//     return BackgroundFetch.BackgroundFetchResult.Failed;
//   }
// });

// const WakeWordScreen = () => {
//   const [status, setStatus] = useState('Initializing...');
//   const porcupineManagerRef = useRef(null);
//   const backgroundAudioRef = useRef(null);
//   const appStateRef = useRef(AppState.currentState);

//   const ACCESS_KEY = 'Qfd1P2IKfEOISOKZxWhJ9YtdmxHAYv9kErvNwcUul9ltcy+zx1H2UA==';

//   const registerBackgroundTask = async () => {
//     try {
//       await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
//         minimumInterval: 1, // 1 second
//         stopOnTerminate: false,
//         startOnBoot: true,
//       });
//     } catch (err) {
//       console.log("Task Register failed:", err);
//     }
//   };

//   const startForegroundService = async () => {
//     if (Platform.OS === 'android') {
//       await Notifications.setNotificationChannelAsync('wake-word-service', {
//         name: 'Wake Word Service',
//         importance: Notifications.AndroidImportance.HIGH,
//         enableVibrate: false,
//         showBadge: false,
//         foregroundService: {
//           name: 'Wake Word Detection',
//           icon: 'ic_notification',
//           importance: 'high',
//           enableVibrate: false,
//           showBadge: false,
//         },
//       });

//       await Notifications.scheduleNotificationAsync({
//         content: {
//           title: 'Wake Word Detection Active',
//           body: 'Listening for "COMPUTER"',
//           priority: 'high',
//           ongoing: true,
//           sticky: true,
//         },
//         trigger: null,
//       });
//     }
//   };

//   const initBackgroundAudio = async () => {
//     try {
//       await Audio.setAudioModeAsync({
//         allowsRecordingIOS: true,
//         playsInSilentModeIOS: true,
//         staysActiveInBackground: true,
//         shouldDuckAndroid: false,
//         playThroughEarpieceAndroid: false,
//       });

//       const { sound } = await Audio.Sound.createAsync(
//         require('@/components/2-seconds-of-silence.mp3'),
//         {
//           shouldPlay: true,
//           isLooping: true,
//           volume: 0.01,
//         },
//         null,
//         true
//       );
      
//       backgroundAudioRef.current = sound;
//       await sound.playAsync();
//     } catch (error) {
//       console.error('Background audio init error:', error);
//     }
//   };

//   const initWakeWordDetection = async () => {
//     try {
//       if (porcupineManagerRef.current) {
//         return;
//       }

//       // Request permissions
//       const audioPermission = await Audio.requestPermissionsAsync();
//       if (audioPermission.status !== 'granted') {
//         setStatus('Microphone permission denied');
//         return;
//       }

//       if (Platform.OS === 'android') {
//         const notifPermission = await Notifications.requestPermissionsAsync();
//         if (notifPermission.status !== 'granted') {
//           setStatus('Notification permission denied');
//           return;
//         }
//       }

//       // Initialize background components
//       await initBackgroundAudio();
//       await registerBackgroundTask();
//       await startForegroundService();

//       // Initialize Porcupine
//       const manager = await PorcupineManager.fromBuiltInKeywords(
//         ACCESS_KEY,
//         [BuiltInKeywords.COMPUTER],
//         async (keywordIndex) => {
//           if (keywordIndex === 0) {
//             setStatus('Wake word detected!');
//             console.log("Computer detected")
            
//             setTimeout(() => {
//               setStatus('Listening...');
//             }, 2000);
//           }
//         },
//         0.5 // sensitivity
//       );

//       porcupineManagerRef.current = manager;
//       await manager.start();
//       setStatus('Listening...');

//     } catch (error) {
//       console.error('Wake word init error:', error);
//       setStatus(`Error: ${error.message}`);
//     }
//   };

//   const handleAppStateChange = async (nextAppState) => {
//     if (
//       appStateRef.current.match(/inactive|background/) && 
//       nextAppState === 'active'
//     ) {
//       // App has come to foreground
//       await initWakeWordDetection();
//     } else if (
//       appStateRef.current === 'active' && 
//       nextAppState.match(/inactive|background/)
//     ) {
//       // App has gone to background
//       if (Platform.OS === 'android') {
//         await startForegroundService();
//       }
//     }
    
//     appStateRef.current = nextAppState;
//   };

//   useEffect(() => {
//     const subscription = AppState.addEventListener('change', handleAppStateChange);
    
//     // Initial setup
//     initWakeWordDetection();

//     return () => {
//       subscription.remove();
//       const cleanup = async () => {
//         if (porcupineManagerRef.current) {
//           await porcupineManagerRef.current.stop();
//           await porcupineManagerRef.current.delete();
//           porcupineManagerRef.current = null;
//         }
//         if (backgroundAudioRef.current) {
//           await backgroundAudioRef.current.unloadAsync();
//           backgroundAudioRef.current = null;
//         }
//         await Notifications.dismissAllNotificationsAsync();
//         await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
//       };
//       cleanup();
//     };
//   }, []);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Wake Word Detection</Text>
//       <Text style={styles.subtitle}>"COMPUTER"</Text>
//       <Text style={styles.status}>{status}</Text>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 20,
//     backgroundColor: '#f5f5f5',
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: 'bold',
//     marginBottom: 8,
//     textAlign: 'center',
//   },
//   subtitle: {
//     fontSize: 18,
//     color: '#666',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   status: {
//     fontSize: 16,
//     marginBottom: 30,
//     textAlign: 'center',
//     color: '#666',
//   }
// });

// export default WakeWordScreen;