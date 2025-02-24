// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// import { Audio } from 'expo-av';
// import * as FileSystem from 'expo-file-system';
// import Constants from 'expo-constants';

// const WhisperTest = () => {
//   const [recording, setRecording] = useState(null);
//   const [isRecording, setIsRecording] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [transcript, setTranscript] = useState('');
//   const [error, setError] = useState(null);

//   const OPENAI_API_KEY = Constants.manifest.extra.OPENAI_API_KEY; // Use env variables

//   const startRecording = async () => {
//     try {
//       const { status } = await Audio.requestPermissionsAsync();
//       if (status !== 'granted') {
//         setError('Microphone permission not granted');
//         return;
//       }

//       await Audio.setAudioModeAsync({
//         allowsRecordingIOS: true,
//         playsInSilentModeIOS: true,
//       });

//       const { recording } = await Audio.Recording.createAsync(
//         Audio.RecordingOptionsPresets.HIGH_QUALITY
//       );

//       setRecording(recording);
//       setIsRecording(true);
//       setError(null);
//     } catch (err) {
//       setError(`Failed to start recording: ${err.message}`);
//     }
//   };

//   const stopRecording = async () => {
//     if (!recording) return;

//     try {
//       setIsRecording(false);
//       setIsProcessing(true);
//       await recording.stopAndUnloadAsync();

//       const uri = recording.getURI();
//       setRecording(null);

//       const transcription = await processAudioWithWhisper(uri);
//       setTranscript(transcription || 'No transcription received');

//       // Delete the file after processing
//       await FileSystem.deleteAsync(uri);
//     } catch (err) {
//       setError(`Failed to process recording: ${err.message}`);
//     }
//     setIsProcessing(false);
//   };

//   const processAudioWithWhisper = async (audioUri) => {
//     try {
//       const formData = new FormData();
//       formData.append('file', {
//         uri: audioUri,
//         type: 'audio/m4a',
//         name: 'recording.m4a',
//       });
//       formData.append('model', 'whisper-1');
//       formData.append('language', 'en');

//       const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${OPENAI_API_KEY}`,
//           'Content-Type': 'multipart/form-data',
//         },
//         body: formData,
//       });

//       if (!response.ok) throw new Error(await response.text());

//       const data = await response.json();
//       return data.text;
//     } catch (err) {
//       setError(`Whisper API error: ${err.message}`);
//       return null;
//     }
//   };

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Whisper API Test</Text>
//       {error && <Text style={styles.error}>{error}</Text>}

//       <TouchableOpacity
//         style={[styles.button, isRecording ? styles.stopButton : styles.startButton]}
//         onPress={isRecording ? stopRecording : startRecording}
//         disabled={isProcessing}
//       >
//         <Text style={styles.buttonText}>
//           {isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
//         </Text>
//       </TouchableOpacity>

//       {transcript && (
//         <View style={styles.transcriptContainer}>
//           <Text style={styles.transcriptTitle}>Transcription:</Text>
//           <Text style={styles.transcript}>{transcript}</Text>
//         </View>
//       )}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
//   title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
//   button: { padding: 15, borderRadius: 25, width: 200, alignItems: 'center' },
//   startButton: { backgroundColor: '#4CAF50' },
//   stopButton: { backgroundColor: '#f44336' },
//   buttonText: { color: 'white', fontSize: 18, fontWeight: '600' },
//   transcriptContainer: { padding: 15, backgroundColor: 'white', borderRadius: 10, marginTop: 20 },
//   transcriptTitle: { fontSize: 18, fontWeight: '600' },
//   transcript: { fontSize: 16, color: '#666' },
//   error: { color: '#f44336', marginBottom: 20, textAlign: 'center' },
// });

// export default WhisperTest;
