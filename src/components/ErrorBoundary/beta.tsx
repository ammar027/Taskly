import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
function VoiceTaskCreator({ onTaskCreated }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    category: ''
  });
  const [currentField, setCurrentField] = useState(null);
  const [captureMode, setCaptureMode] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [readyForNextField, setReadyForNextField] = useState(true);
  // Track if this is first-time use
  const isFirstUse = useRef(true);
  // Track time since last significant recognition
  const lastRecognitionTime = useRef(Date.now());
  // Register speech recognition event listeners
  useSpeechRecognitionEvent("start", handleRecognitionStart);
  useSpeechRecognitionEvent("end", handleRecognitionEnd);
  useSpeechRecognitionEvent("result", handleSpeechResult);
  useSpeechRecognitionEvent("error", handleSpeechError);
  useSpeechRecognitionEvent("speechstart", () => {
    lastRecognitionTime.current = Date.now();
  });
  function handleRecognitionStart() {
    setIsListening(true);
    setFeedbackMessage('Listening...');
    
    // Show first-time instructions
    if (isFirstUse.current) {
      setTimeout(() => {
        setFeedbackMessage('Say "Title" followed by your task title');
      }, 2000);
      isFirstUse.current = false;
    }
  }
  function handleRecognitionEnd() {
    setIsListening(false);
    setProcessing(false);
    
    // If we're in capture mode but haven't captured anything yet
    if (captureMode && currentField && !currentTask[currentField]) {
      setFeedbackMessage(`I didn't catch that. Please try saying "${capitalizeFirstLetter(currentField)}" again.`);
    }
    
    setCaptureMode(false);
  }
  function handleSpeechError(event) {
    console.log("Error:", event.error, event.message);
    
    if (event.error === 'no-speech') {
      setFeedbackMessage("I didn't hear anything. Please try again.");
    } else if (event.error === 'not-allowed') {
      setFeedbackMessage("Microphone permission is required.");
    } else {
      setFeedbackMessage(`Error: ${event.message || 'Something went wrong'}`);
    }
  }
  function handleSpeechResult(event) {
    const result = event.results[0]?.transcript || '';
    setTranscript(result);
    lastRecognitionTime.current = Date.now();
    
    // Don't process while still capturing or if nothing to process
    if (!result.trim()) return;
    
    setProcessing(true);
    
    // Process the speech input with improved accuracy
    processVoiceInput(result, event.isFinal);
  }
  function processVoiceInput(text, isFinal) {
    // Keywords with multiple variations for better recognition
    const keywords = {
      TITLE: ['title', 'task title', 'the title', 'title is', 'name', 'task name', 'create a task' ],
      DESCRIPTION: ['description', 'details', 'task details', 'describe', 'the description', 'description is', 'descrption will be'],
      DUE_DATE: ['due date', 'deadline', 'due', 'due by', 'when is it due', 'complete by', 'finish by', 'date'],
      CATEGORY: ['category', 'type', 'tag', 'label', 'group', 'the category', 'category is']
    };
    const lowerText = text.toLowerCase();
    // If we're not in capture mode, look for keywords
    if (!captureMode) {
      for (const [field, fieldKeywords] of Object.entries(keywords)) {
        if (containsAny(lowerText, fieldKeywords)) {
          const fieldName = field.toLowerCase();
          setCurrentField(fieldName);
          setCaptureMode(true);
          setReadyForNextField(false);
          
          // Extract content if keyword is followed by content in the same utterance
          const content = extractContentAfterKeyword(text, lowerText, fieldKeywords);
          
          if (content && content.trim().length > 0) {
            // Only update if we have actual content
            setCurrentTask(prev => ({
              ...prev,
              [fieldName]: content
            }));
            
            // Provide feedback
            setFeedbackMessage(`Got it! "${fieldName}" is "${content}"`);
            setReadyForNextField(true);
            setCaptureMode(false);
          } else {
            // No content yet, waiting for it
            setFeedbackMessage(`Tell me the ${fieldName}...`);
          }
          return;
        }
      }
    }
    // If in capture mode and we have a current field, try to capture content
    if (captureMode && currentField) {
      // Process content for current field
      // For final results or significant interim results
      if (isFinal || (text.length > 5 && text.split(' ').length > 1)) {
        // Check if the user started a new field instead
        let newFieldDetected = false;
        for (const [field, fieldKeywords] of Object.entries(keywords)) {
          const fieldName = field.toLowerCase();
          if (fieldName !== currentField && containsAny(lowerText, fieldKeywords)) {
            // User wants to move to a different field
            setCurrentField(fieldName);
            setCaptureMode(true);
            setReadyForNextField(false);
            
            // Extract content if keyword is followed by content
            const content = extractContentAfterKeyword(text, lowerText, fieldKeywords);
            
            if (content && content.trim().length > 0) {
              setCurrentTask(prev => ({
                ...prev,
                [fieldName]: content
              }));
              setFeedbackMessage(`Got it! "${fieldName}" is "${content}"`);
              setReadyForNextField(true);
              setCaptureMode(false);
            } else {
              setFeedbackMessage(`Tell me the ${fieldName}...`);
            }
            newFieldDetected = true;
            break;
          }
        }
        if (!newFieldDetected) {
          // No new field detected, use the text as content for current field
          const fieldKeywords = keywords[currentField.toUpperCase()];
          const content = extractContentAfterKeyword(text, lowerText, fieldKeywords) || text;
          
          setCurrentTask(prev => ({
            ...prev,
            [currentField]: content
          }));
          
          setFeedbackMessage(`Got it! "${currentField}" is "${content}"`);
          setReadyForNextField(true);
          setCaptureMode(false);
        }
      }
    }
    // Check for task completion commands
    if (isFinal && (
      lowerText.includes('save task') || 
      lowerText.includes('save this task') || 
      lowerText.includes('done') || 
      lowerText.includes('finish task') || 
      lowerText.includes('that\'s it') 
    )) {
      stopListeningAndSaveTask();
    }
    
    setProcessing(false);
  }
  // Extract content after a keyword is detected
  function extractContentAfterKeyword(text, lowerText, keywords) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        const keywordIndex = lowerText.indexOf(keyword.toLowerCase());
        const content = text.substring(keywordIndex + keyword.length).trim();
        
        // Filter out common filler words
        if (content && !['is', 'the', 'a', 'an', 'this', 'that'].includes(content.toLowerCase())) {
          return content;
        }
      }
    }
    return null;
  }
  // Helper function to check if text contains any of the keywords
  function containsAny(text, keywords) {
    return keywords.some(keyword => {
      // Match either exact occurrence or followed by a space/punctuation
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      return regex.test(text);
    });
  }
  // Start voice recognition with improved settings
  async function startListening() {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        setFeedbackMessage("Microphone permission is required");
        return;
      }
      
      setFeedbackMessage('Starting...');
      
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        // Improve recognition accuracy for task-related terminology
        contextualStrings: [
          "title", "description", "due date", "category",
          "task", "project", "deadline", "work", "personal"
        ]
      });
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setFeedbackMessage('Error starting voice recognition');
    }
  }
  // Stop voice recognition and save task
  function stopListeningAndSaveTask() {
    ExpoSpeechRecognitionModule.stop();
    
    // Basic validation
    if (!currentTask.title.trim()) {
      setFeedbackMessage('Please at least provide a task title');
      return;
    }
    
    // Pass the created task to parent component
    if (onTaskCreated) {
      onTaskCreated({...currentTask});
      
      // Show success feedback
      setFeedbackMessage('Task created successfully!');
      
      // Reset for next task
      setTimeout(() => {
        setCurrentTask({
          title: '',
          description: '',
          dueDate: '',
          category: ''
        });
        setFeedbackMessage('Ready for a new task');
      }, 2000);
    }
  }
  // Helper function to capitalize field names
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  // Show intro tutorial for first-time users
  function showTutorial() {
    Alert.alert(
      "How to Create Voice Tasks",
      "1. Tap 'Start Voice Input'\n\n" +
      "2. Say a field name followed by content:\n" +
      "   • \"Title: Buy groceries\"\n" +
      "   • \"Description: Milk, eggs, bread\"\n" +
      "   • \"Due date: Tomorrow\"\n" +
      "   • \"Category: Shopping\"\n\n" +
      "3. You can say fields in any order\n\n" +
      "4. Say \"Done\" or tap \"Save Task\" when finished",
      [{ text: "Got it!" }]
    );
  }
  // Render next field suggestion based on what's missing
  function renderNextFieldSuggestion() {
    if (!readyForNextField) return null;
    
    const missingFields = [];
    if (!currentTask.title) missingFields.push("Title");
    if (!currentTask.description) missingFields.push("Description");
    if (!currentTask.dueDate) missingFields.push("Due Date");
    if (!currentTask.category) missingFields.push("Category");
    
    if (missingFields.length === 0) {
      return (
        <Text style={styles.suggestion}>
          Say "Done" or tap "Save Task" to finish
        </Text>
      );
    }
    
    return (
      <Text style={styles.suggestion}>
        Try saying "{missingFields[0]}" next
      </Text>
    );
  }
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Task Creator</Text>
        <TouchableOpacity onPress={showTutorial} style={styles.helpButton}>
          <Text style={styles.helpButtonText}>?</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.feedbackContainer}>
        <Text style={styles.feedbackText}>{feedbackMessage}</Text>
        {isListening && <ActivityIndicator size="small" color="#007AFF" style={styles.indicator} />}
        {renderNextFieldSuggestion()}
      </View>
      {isListening ? (
        <View style={styles.buttonGroup}>
          <Button 
            title="Save Task" 
            onPress={stopListeningAndSaveTask} 
            color="#007AFF"
          />
          <Button 
            title="Cancel" 
            onPress={() => ExpoSpeechRecognitionModule.abort()} 
            color="#FF3B30"
          />
        </View>
      ) : (
        <Button 
          title="Start Voice Input" 
          onPress={startListening} 
          color="#34C759"
        />
      )}
      <View style={styles.transcriptContainer}>
        <Text style={styles.transcriptLabel}>I heard:</Text>
        <Text style={styles.transcript}>{transcript}</Text>
      </View>
      <View style={styles.taskPreview}>
        <Text style={styles.previewTitle}>Task Preview</Text>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Title:</Text>
          <Text style={styles.fieldValue}>
            {currentTask.title || <Text style={styles.placeholder}>Not set</Text>}
          </Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Description:</Text>
          <Text style={styles.fieldValue}>
            {currentTask.description || <Text style={styles.placeholder}>Not set</Text>}
          </Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Due Date:</Text>
          <Text style={styles.fieldValue}>
            {currentTask.dueDate || <Text style={styles.placeholder}>Not set</Text>}
          </Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Category:</Text>
          <Text style={styles.fieldValue}>
            {currentTask.category || <Text style={styles.placeholder}>Not set</Text>}
          </Text>
        </View>
      </View>      
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Voice Tips:</Text>
        <Text style={styles.tipText}>• Say "Title" then your task title</Text>
        <Text style={styles.tipText}>• Say "Done" when finished</Text>
        <Text style={styles.tipText}>• Speak clearly with pauses between fields</Text>
      </View>
    </View>
  );
}

function TaskApp() {
  const [tasks, setTasks] = useState([]);
  
  const handleNewTask = (task) => {
    setTasks(prevTasks => [...prevTasks, task]);
  };
  
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <VoiceTaskCreator onTaskCreated={handleNewTask} />
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginTop: 24, marginBottom: 12 }}>
        Your Tasks ({tasks.length})
      </Text>
      <ScrollView>
        {tasks.map((task, index) => (
          <View key={index} style={taskCardStyles.card}>
            <Text style={taskCardStyles.cardTitle}>{task.title}</Text>
            {task.description ? (
              <Text style={taskCardStyles.cardDescription}>{task.description}</Text>
            ) : null}
            <View style={taskCardStyles.cardFooter}>
              {task.dueDate ? (
                <Text style={taskCardStyles.dueDate}>Due: {task.dueDate}</Text>
              ) : null}
              {task.category ? (
                <View style={taskCardStyles.categoryBadge}>
                  <Text style={taskCardStyles.categoryText}>{task.category}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
        {tasks.length === 0 && (
          <View style={taskCardStyles.emptyState}>
            <Text style={taskCardStyles.emptyStateText}>
              No tasks yet. Use the voice creator above to add tasks.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}


export default TaskApp;