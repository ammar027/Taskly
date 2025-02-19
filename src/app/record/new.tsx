import React, { useState, useEffect, useRef } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from "react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { useSpeechRecognitionEvent } from "expo-speech-recognition";
import { Text, ActivityIndicator, useTheme, Surface, ProgressBar, Chip, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { StatusBar } from "expo-status-bar";
import LottieView from 'lottie-react-native';
import { useLocalSearchParams, useRouter } from "expo-router"; // Import useRouter from expo-router
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const DESCRIPTION_DECISION_COUNTDOWN = 0; // Reduced to 3 seconds for faster flow
const SPEECH_TIMEOUT = 2500; // Shorter timeout for speech detection

const NewTask = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    content: string; 
    priority: string;
    assistantRequest: string;
    autoStart: string;
  }>();
  const [recognizing, setRecognizing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0: title, 1: description prompt, 2: description, 3: summary
  const [taskData, setTaskData] = useState({
    title: "",
    description: "",
    priority: params.priority || "medium", // Use priority from params if available
    created: null, // Will store creation timestamp
  });
  const [transcript, setTranscript] = useState("");
  const pulseAnim = new Animated.Value(1);
  const [countdown, setCountdown] = useState(0);
  const [progress, setProgress] = useState(0);
  const [askingDescription, setAskingDescription] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const animationRef = useRef(null);
  const [currentAction, setCurrentAction] = useState(""); // Track current automatic action
  const speechTimeoutRef = useRef(null);

  // Enhanced deep link handling
  useEffect(() => {
    // Handle both Google Assistant and direct deep link (adb) cases
    if (params.content) {
      console.log('Received task from deep link:', params.content);
      
      // Set the task title from deep link content
      setTaskData(prev => ({
        ...prev,
        title: params.content,
        priority: params.priority || prev.priority
      }));
      
      // Skip recording title and move to description prompt
      setTranscript(params.content);
      setCurrentStep(1); // Move to description prompt
      setWaitingForResponse(true);
      setCountdown(DESCRIPTION_DECISION_COUNTDOWN);
      setProgress(0);
      setAskingDescription(true);
      setCurrentAction("Task title received. Add description?");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Optional: Auto-start listening for description decision
      if (params.autoStart === 'true') {
        setTimeout(() => {
          handleStart();
        }, 1000);
      }
    } else {
      // No deep link content, start normal voice flow after a delay
      const timer = setTimeout(() => {
        if (currentStep === 0 && !recognizing && !transcript) {
          setCurrentAction("Starting voice input...");
          handleStart();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);


     // Auto-start the process when component mounts - modified to check for Assistant params
  useEffect(() => {
    // Only auto-start if not handling Assistant request with content
    if (!(params.assistantRequest === 'true' && params.content)) {
      const timer = setTimeout(() => {
        if (currentStep === 0 && !recognizing && !transcript) {
          setCurrentAction("Starting automatically...");
          handleStart();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

   // Enhanced deep link handling
   useEffect(() => {
    // Handle both Google Assistant and direct deep link (adb) cases
    if (params.content) {
      console.log('Received task from deep link:', params.content);
      
      // Set the task title from deep link content
      setTaskData(prev => ({
        ...prev,
        title: params.content,
        priority: params.priority || prev.priority
      }));
      
      // Skip recording title and move to description prompt
      setTranscript(params.content);
      setCurrentStep(1); // Move to description prompt
      setWaitingForResponse(true);
      setCountdown(DESCRIPTION_DECISION_COUNTDOWN);
      setProgress(0);
      setAskingDescription(true);
      setCurrentAction("Task title received. Add description?");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Optional: Auto-start listening for description decision
      if (params.autoStart === 'true') {
        setTimeout(() => {
          handleStart();
        }, 1000);
      }
    } else {
      // No deep link content, start normal voice flow after a delay
      const timer = setTimeout(() => {
        if (currentStep === 0 && !recognizing && !transcript) {
          setCurrentAction("Starting voice input...");
          handleStart();
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);


  // Pulse animation effect
  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation;
    if (recognizing) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [recognizing]);
  // Auto-process title after stopping recognition
  useEffect(() => {
    if (!recognizing && transcript && currentStep === 0 && !waitingForResponse) {
      // Short delay to allow for UI updates before processing
      const timer = setTimeout(() => {
        processTitleInput();
      }, 500);     
      return () => clearTimeout(timer);
    }
  }, [recognizing, transcript, currentStep]);
  // Handle description decision countdown
  useEffect(() => {
    if (waitingForResponse && countdown > 0) {
      setCurrentAction("Continuing in " + countdown + "s...");
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
        setProgress(1 - (countdown - 1) / DESCRIPTION_DECISION_COUNTDOWN);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (waitingForResponse && countdown === 0) {
      // Time's up, proceed with default (no description)
      setWaitingForResponse(false);
      setCurrentAction("Auto-continuing without description");
      finishTask();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [waitingForResponse, countdown]);
  // Add speech timeout handling - stop recognition if no speech detected
  useEffect(() => {
    if (recognizing) {
      // Clear any existing timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      // Set new timeout
      speechTimeoutRef.current = setTimeout(() => {
        if (recognizing && !transcript) {
          // No speech detected after timeout
          setCurrentAction("No speech detected, stopping...");
          handleStop();
        }
      }, SPEECH_TIMEOUT);
    }
    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, [recognizing, transcript]);
  // Speech recognition event handlers
  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentAction("Listening...");
  }); 
  useSpeechRecognitionEvent("end", () => {
    setRecognizing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCurrentAction(transcript ? "Processing input..." : "No speech detected");
    // If we're in the description decision phase, process the response
    if (currentStep === 1 && transcript) {
      processDescriptionDecision();
    }
  });
  useSpeechRecognitionEvent("result", (event) => {
    const newTranscript = event.results[0]?.transcript || "";
    setTranscript(newTranscript);
    
    // Reset timeout if we get new speech
    if (newTranscript && speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      
      // Check for "yes" during description prompt immediately
      if (currentStep === 1 && waitingForResponse) {
        const lowercaseTranscript = newTranscript.toLowerCase();
        if (lowercaseTranscript.includes('yes') || 
            lowercaseTranscript.includes('yeah') || 
            lowercaseTranscript.includes('sure') || 
            lowercaseTranscript.includes('okay') || 
            lowercaseTranscript.includes('yep') || 
            lowercaseTranscript.includes('ok')) {
          // Stop recognition and process the "yes" response right away
          handleStop();
        }
      }
    }
  });

  const handleStart = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      console.warn("Permissions not granted", result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setCurrentAction("Microphone permission denied");
      return;
    }

    setCurrentAction("Starting speech recognition...");
    ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
    });
  };

  const handleStop = () => {
    ExpoSpeechRecognitionModule.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentAction("Stopping recognition...");
  };

  // Auto-start the process when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep === 0 && !recognizing && !transcript) {
        setCurrentAction("Starting automatically...");
        handleStart();
      }
    }, 1000); // Reduced to 1 second for faster start
    
    return () => clearTimeout(timer);
  }, []);

  // Process the title input and move to description decision
  // Process the title input and move to description decision
  const processTitleInput = () => {
    if (transcript) {
      setCurrentAction("Title captured, moving to description option");
      setTaskData(prev => ({
        ...prev,
        title: transcript
      }));
      setTranscript("");
      setCurrentStep(1);
      setWaitingForResponse(true);
      setCountdown(DESCRIPTION_DECISION_COUNTDOWN);
      setProgress(0);
      setAskingDescription(true);
      
      // Start listening for description decision
      setTimeout(() => {
        handleStart();
      }, 300);
    }
  };

  // Process user's response to "Do you want to add a description?"
  const processDescriptionDecision = () => {
    setWaitingForResponse(false);
    const response = transcript.toLowerCase();
    
    if (response.includes('yes') || response.includes('yeah') || 
        response.includes('sure') || response.includes('okay') || 
        response.includes('yep') || response.includes('ok')) {
      // User wants to add a description
      setCurrentAction("Adding description - please speak now");
      setCurrentStep(2);
      setTranscript("");
      setAskingDescription(false);
      // Start listening for description after a brief pause
      setTimeout(() => {
        handleStart();
      }, 300); // Reduced for faster flow
    } else {
      // User doesn't want a description, finalize task
      setCurrentAction("Skipping description");
      finishTask();
    }
  };

  // Process description input
  const processDescription = () => {
    if (transcript) {
      setCurrentAction("Description captured, finalizing task");
      setTaskData(prev => ({
        ...prev,
        description: transcript
      }));
    }
    finishTask();
  };

  // Auto-process description after stopping recognition
  useEffect(() => {
    if (!recognizing && transcript && currentStep === 2) {
      const timer = setTimeout(() => {
        processDescription();
      }, 500); // Reduced delay for faster flow
      
      return () => clearTimeout(timer);
    }
  }, [recognizing, transcript, currentStep]);

  // Function to save task data and navigate to another screen
  const saveTaskAndNavigate = () => {
    try {
      const finalTaskData = {
        ...taskData,
        id: Date.now().toString(),
        created: new Date().toISOString(),
        status: "new"
      };
      
      const noteData = {
        id: finalTaskData.id,
        title: finalTaskData.title,
        content: finalTaskData.description || "No description",
        date: new Date(finalTaskData.created).toISOString().split('T')[0],
        category: finalTaskData.priority === "high" ? "Important" : "Task",
        color: finalTaskData.priority === "high" ? "#DB2777" : 
               finalTaskData.priority === "medium" ? "#4F46E5" : "#059669"
      };
      
      console.log('About to navigate with note data:', noteData);
      
      // First, store the note in AsyncStorage
      AsyncStorage.getItem('notes_data')
        .then(storedNotes => {
          const currentNotes = storedNotes ? JSON.parse(storedNotes) : [];
          const updatedNotes = [noteData, ...currentNotes];
          return AsyncStorage.setItem('notes_data', JSON.stringify(updatedNotes));
        })
        .then(() => {
          console.log('Note saved to storage, now navigating...');
          // Then navigate
          router.replace({
            pathname: "/",
            params: { 
              newNote: JSON.stringify(noteData),
              timestamp: Date.now()
            }
          });
        })
        .catch(error => {
          console.error('Error in save and navigate:', error);
        });
  
      setCurrentAction("Task saved successfully");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error("Error preparing task data:", error);
      setCurrentAction("Error saving task");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };


  // Finalize task creation
  const finishTask = () => {
    setCurrentStep(3); // Move to summary
    setTranscript("");
    setCurrentAction("Task created successfully");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (animationRef.current) {
      animationRef.current.play();
    }
    
    // Update task data with final timestamp
    setTaskData(prev => ({
      ...prev,
      created: new Date().toISOString()
    }));
    
    // Auto-save after 3 seconds (reduced from 5)
    setTimeout(() => {
      if (currentStep === 3) {
        setCurrentAction("Auto-saving task...");
        saveTaskAndNavigate();
      }
    }, 3000); // Reduced from 5000
  };

  // Get current step guidance
  const getStepLabel = () => {
    switch (currentStep) {
      case 0:
        return "Recording Task Title";
      case 1:
        return "Add Description?";
      case 2:
        return "Recording Task Description";
      default:
        return "Task Summary";
    }
  };

  const getStepInstructions = () => {
    switch (currentStep) {
      case 0:
        return "Speak a clear title for your task";
      case 1:
        return `Do you want to add a description? (${countdown}s)`;
      case 2:
        return "Describe your task in detail";
      default:
        return "";
    }
  };

  // Render task summary with animation
  const renderTaskSummary = () => {
    if (currentStep === 3) {
      return (
        <View style={styles.taskSummary}>
          <View style={styles.completionAnimation}>
            <LottieView
              ref={animationRef}
              source={require('@/components/task-complete.json')}
              autoPlay={false}
              loop={false}
              style={styles.lottieAnimation}
            />
          </View>
          
          <Text style={styles.summaryHeader}>Task Created!</Text>
          <Surface style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{taskData.title}</Text>
            
            {taskData.description ? (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Description:</Text>
                <Text style={styles.summaryDescription}>{taskData.description}</Text>
              </View>
            ) : (
              <Text style={styles.noDescription}>No description added</Text>
            )}
            
            <View style={styles.priorityContainer}>
              <Chip 
                style={[
                  styles.priorityChip, 
                  { backgroundColor: colors.primary }
                ]}
                icon="flag"
              >
                {taskData.priority.toUpperCase()} PRIORITY
              </Chip>
            </View>
          </Surface>
          
          <View style={styles.autoSaveIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.autoSaveText}>
              Auto-saving in 3 seconds...
            </Text>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.statusBar}>
        <View style={styles.statusIndicator}>
          {recognizing && (
            <Animated.View 
              style={[
                styles.recordingIndicator, 
                { 
                  backgroundColor: colors.error,
                  transform: [{ scale: pulseAnim }] 
                }
              ]} 
            />
          )}
          <Text style={[styles.statusText, { color: recognizing ? colors.error : colors.primary }]}>
            {getStepLabel()}
          </Text>
        </View>
      </View>

      {/* Auto-action indicator */}
      <View style={styles.actionIndicator}>
        <Text style={[styles.actionText, { color: colors.primary }]}>
          {currentAction}
        </Text>
      </View>

      {waitingForResponse && (
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progress}
            color={colors.primary}
            style={styles.progressBar}
          />
        </View>
      )}

      <Surface style={styles.transcriptSurface}>
        <ScrollView 
          contentContainerStyle={styles.transcriptScrollview}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 3 ? (
            renderTaskSummary()
          ) : transcript ? (
            <View style={styles.transcriptContainer}>
              <MaterialCommunityIcons 
                name="format-quote-open" 
                size={24} 
                color={colors.primary} 
                style={styles.quoteIcon}
              />
              <Text style={styles.transcript}>{transcript}</Text>
              <MaterialCommunityIcons 
                name="format-quote-close" 
                size={24} 
                color={colors.primary} 
                style={styles.quoteIcon}
              />
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              {currentStep === 1 && askingDescription ? (
                <View style={styles.descriptionPrompt}>
                  <MaterialCommunityIcons 
                    name="help-circle-outline" 
                    size={48} 
                    color={colors.primary} 
                  />
                  <Text style={styles.promptText}>
                    Do you want to add a description?
                  </Text>
                  <Text style={styles.countdownText}>
                    Say "Yes" or wait {countdown}s for "No"
                  </Text>
                  <View style={styles.decisionOptions}>
                    <View style={[styles.optionButton, { borderColor: colors.primary }]}>
                      <Text style={{ color: colors.primary }}>Yes</Text>
                    </View>
                    <View style={[styles.optionButton, { borderColor: colors.primary, opacity: 0.6 }]}>
                      <Text style={{ color: colors.primary }}>Auto-No</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <MaterialCommunityIcons 
                    name={
                      currentStep === 0 ? "text-box-plus-outline" : 
                      currentStep === 2 ? "text-box-outline" : 
                      "flag-variant"
                    } 
                    size={48} 
                    color={colors.disabled} 
                  />
                  <Text style={styles.emptyStateText}>
                    {getStepInstructions()}
                  </Text>
                  
                  {!recognizing && currentStep === 0 && (
                    <TouchableOpacity
                      style={[styles.startPromptButton, { backgroundColor: colors.primary }]}
                      onPress={handleStart}
                    >
                      <MaterialCommunityIcons name="microphone" size={20} color="white" />
                      <Text style={styles.startPromptText}>Starting Automatically...</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
          
          {/* Step indicator dots */}
          <View style={styles.stepIndicator}>
            {[0, 1, 2, 3].map(step => (
              <View 
                key={step}
                style={[
                  styles.stepDot,
                  { 
                    backgroundColor: currentStep >= step ? colors.primary : colors.disabled,
                    width: currentStep === step ? 12 : 8,
                    height: currentStep === step ? 12 : 8,
                  }
                ]}
              />
            ))}
          </View>
        </ScrollView>
      </Surface>

      <View style={styles.controls}>
        {currentStep < 3 && (
          <>
            {recognizing && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.surface }]}
                onPress={handleStop}
              >
                <MaterialCommunityIcons
                  name="cancel"
                  size={24}
                  color={colors.error}
                />
                <Text style={[styles.actionButtonText, { color: colors.error }]}>Cancel</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.micButton, 
                { 
                  backgroundColor: recognizing ? colors.error : colors.primary,
                  shadowColor: recognizing ? colors.error : colors.primary,
                }
              ]}
              onPress={recognizing ? handleStop : handleStart}
              disabled={currentStep === 1 && waitingForResponse}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={recognizing ? "microphone-off" : "microphone"}
                size={30}
                color="white"
              />
              {recognizing && (
                <ActivityIndicator 
                  size="large" 
                  color="white"
                  style={styles.recordingActivity}
                />
              )}
            </TouchableOpacity>

            {/* Voice command hints */}
            <View style={styles.voiceHints}>
              <Text style={styles.voiceHintText}>
                {currentStep === 0 ? "Speak title - auto-confirms when done" :
                 currentStep === 1 ? "Say 'Yes' clearly to add description" :
                 currentStep === 2 ? "Describe task - auto-confirms when done" : ""}
              </Text>
            </View>
          </>
        )}
        
        {currentStep === 3 && (
          <View style={styles.finalButtons}>
            <TouchableOpacity
              style={[styles.finalButton, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
              onPress={() => {
                // Edit task
                setCurrentStep(0);
                setTranscript(taskData.title);
                setCurrentAction("Editing task...");
              }}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.finalButtonText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.finalButton, { backgroundColor: colors.primary }]}
              onPress={saveTaskAndNavigate}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color="white"
              />
              <Text style={styles.finalButtonText}>Save Task</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusBar: { alignItems: 'center', justifyContent: 'center', marginTop: 50, marginBottom: 5, height: 40 },
  statusIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  statusText: { fontSize: 16, fontWeight: '600' },
  recordingIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  actionIndicator: { alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  actionText: { fontSize: 14, fontStyle: 'italic', opacity: 0.8 },
  transcriptSurface: { flex: 1, width: width - 40, marginHorizontal: 20, marginVertical: 10, borderRadius: 20, elevation: 4, overflow: 'hidden' },
  transcriptScrollview: { padding: 20, minHeight: '100%', position: 'relative' },
  transcriptContainer: { padding: 15, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 12, marginBottom: 20 },
  transcript: { fontSize: 18, lineHeight: 28, textAlign: 'center', paddingVertical: 10 },
  quoteIcon: { alignSelf: 'center', opacity: 0.7 },
  emptyStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emptyStateText: { textAlign: 'center', marginTop: 20, fontSize: 16, opacity: 0.7 },
  controls: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 30, position: 'relative' },
  micButton: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  recordingActivity: { position: 'absolute', width: '200%', height: '200%', opacity: 0.2 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, marginHorizontal: 15, marginBottom: 15, elevation: 3 },
  actionButtonText: { color: 'white', fontWeight: '500', marginLeft: 6 },
  progressContainer: { paddingHorizontal: 40, marginVertical: 5 },
  progressBar: { height: 6, borderRadius: 3 },
  voiceHints: { marginTop: 15, alignItems: 'center', padding: 10, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 15 },
  voiceHintText: { fontSize: 14, opacity: 0.8, fontStyle: 'italic' },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 20, left: 0, right: 0 },
  stepDot: { borderRadius: 6, marginHorizontal: 8 },
  taskSummary: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  completionAnimation: { width: 120, height: 120, marginBottom: 20 },
  lottieAnimation: { width: '100%', height: '100%' },
  summaryHeader: { fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  summaryCard: { width: '100%', padding: 20, borderRadius: 15, elevation: 2 },
  summaryTitle: { fontSize: 20, fontWeight: '600', marginBottom: 15 },
  descriptionContainer: { marginBottom: 20 },
  descriptionLabel: { fontSize: 16, fontWeight: '500', marginBottom: 5, opacity: 0.7 },
  summaryDescription: { fontSize: 16, lineHeight: 24 },
  noDescription: { fontSize: 16, fontStyle: 'italic', opacity: 0.5, marginBottom: 20 },
  priorityContainer: { marginTop: 10 },
  priorityChip: { alignSelf: 'flex-start' },
  autoSaveIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, padding: 10, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 20 },
  autoSaveText: { marginLeft: 10, fontSize: 14, fontStyle: 'italic' },
  descriptionPrompt: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  promptText: { fontSize: 18, fontWeight: '600', marginTop: 15, marginBottom: 10, textAlign: 'center' },
  countdownText: { fontSize: 14, opacity: 0.7, marginBottom: 20 },
  decisionOptions: { flexDirection: 'row', justifyContent: 'center', width: '100%' },
  optionButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginHorizontal: 10, minWidth: 80, alignItems: 'center' },
  startPromptButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 25 },
  startPromptText: { color: 'white', marginLeft: 8, fontWeight: '500' },
  finalButtons: { flexDirection: 'row', justifyContent: 'center', width: '100%' },
  finalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, marginHorizontal: 10, minWidth: 120, elevation: 2 },
  finalButtonText: { marginLeft: 8, fontWeight: '500' }
});

export default NewTask;