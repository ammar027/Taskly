// app/note/[id].tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const STORAGE_KEY = 'notes_data';

export default function NoteDetails() {
  const { id } = useLocalSearchParams();
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Editable state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  
  // Load note details
  useEffect(() => {
    const loadNoteDetails = async () => {
      try {
        const savedNotes = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedNotes) {
          const parsedNotes = JSON.parse(savedNotes);
          const foundNote = parsedNotes.find(note => note.id === id);
          
          if (foundNote) {
            console.log('Found note:', foundNote);
            setNote(foundNote);
            setTitle(foundNote.title);
            setContent(foundNote.content);
            setCategory(foundNote.category);
          } else {
            console.log('Note not found');
            Alert.alert('Error', 'Note not found');
            router.back();
          }
        }
      } catch (error) {
        console.error('Error loading note details:', error);
        Alert.alert('Error', 'Failed to load note details');
      } finally {
        setIsLoading(false);
      }
    };

    loadNoteDetails();
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      return;
    }

    try {
      setIsLoading(true);
      
      // Get current notes
      const savedNotes = await AsyncStorage.getItem(STORAGE_KEY);
      if (!savedNotes) {
        throw new Error('No notes found');
      }
      
      const parsedNotes = JSON.parse(savedNotes);
      
      // Update the specific note
      const updatedNotes = parsedNotes.map(n => {
        if (n.id === id) {
          return {
            ...n,
            title,
            content,
            category,
            lastEdited: new Date().toISOString(),
          };
        }
        return n;
      });
      
      // Save back to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
      
      // Update local state
      setNote(prev => ({
        ...prev,
        title,
        content,
        category,
        lastEdited: new Date().toISOString(),
      }));
      
      setIsEditing(false);
      Alert.alert('Success', 'Note updated successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  }, [id, title, content, category]);

  const handleCancel = () => {
    // Reset to original values
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Note not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header with back button and edit/save buttons */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </Pressable>
        
        <View style={styles.headerRightButtons}>
          {isEditing ? (
            <>
              <Pressable style={[styles.headerButton, styles.cancelButton]} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.headerButton, styles.saveButton]} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.headerButton} onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil" size={20} color="#4F46E5" />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          )}
        </View>
      </View>
      
      <ScrollView style={styles.contentContainer}>
        <View style={[styles.categoryBadge, { backgroundColor: `${note.color}20`, borderColor: note.color }]}>
          {isEditing ? (
            <TextInput
              style={[styles.categoryInput, { color: note.color }]}
              value={category}
              onChangeText={setCategory}
              placeholder="Category"
              placeholderTextColor="#94A3B8"
            />
          ) : (
            <Text style={[styles.categoryText, { color: note.color }]}>{note.category}</Text>
          )}
        </View>
        
        {isEditing ? (
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor="#94A3B8"
          />
        ) : (
          <Text style={styles.titleText}>{note.title}</Text>
        )}
        
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color="#64748B" />
          <Text style={styles.dateText}>
            {new Date(note.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          {note.lastEdited && (
            <>
              <Text style={styles.dateText}> • Edited: </Text>
              <Text style={styles.dateText}>
                {new Date(note.lastEdited).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </>
          )}
        </View>
        
        {isEditing ? (
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="Note content..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
          />
        ) : (
          <Text style={styles.contentText}>{note.content}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '600',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  editButtonText: {
    marginLeft: 4,
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryInput: {
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
    minWidth: 80,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    padding: 0,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dateText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#334155',
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#334155',
    padding: 0,
    height: 300,
  },
});