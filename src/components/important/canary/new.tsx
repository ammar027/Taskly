// app/record/new.tsx
import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function NewRecordScreen() {
  const params = useLocalSearchParams<{ content: string; priority: string }>();
  const [taskContent, setTaskContent] = useState('');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    // Pre-fill form if we received parameters from deep link
    if (params.content) {
      setTaskContent(params.content);
    }
    if (params.priority && ['high', 'medium', 'low'].includes(params.priority)) {
      setPriority(params.priority);
    }
    
    console.log('Record screen opened with params:', params);
  }, [params.content, params.priority]);

  const handleSave = () => {
    // Save the task (implement your saving logic)
    console.log('Saving task:', { content: taskContent, priority });
    
    // Navigate back
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'New Record',
        headerShown: true
      }} />
      
      <Text style={styles.label}>Task Content</Text>
      <TextInput
        style={styles.input}
        value={taskContent}
        onChangeText={setTaskContent}
        placeholder="Enter task content"
        multiline
      />
      
      <Text style={styles.label}>Priority</Text>
      <View style={styles.priorityContainer}>
        {['low', 'medium', 'high'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.priorityButton,
              p === priority && styles.selectedPriority,
              p === 'high' && styles.highPriority,
              p === 'medium' && styles.mediumPriority,
              p === 'low' && styles.lowPriority,
            ]}
            onPress={() => setPriority(p)}
          >
            <Text style={styles.priorityText}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <TouchableOpacity 
        style={styles.saveButton}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>Save Task</Text>
      </TouchableOpacity>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedPriority: {
    borderWidth: 2,
  },
  highPriority: {
    backgroundColor: 'rgba(255, 99, 71, 0.1)',
    borderColor: 'tomato',
  },
  mediumPriority: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderColor: 'orange',
  },
  lowPriority: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderColor: '#2ecc71',
  },
  priorityText: {
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4A6DFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});