import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/components/ThemeContext';

const STORAGE_KEY = 'notes_data';

const LoadingSpinner = () => {
  const { isDarkMode } = useTheme();
  return (
    <View style={[styles.loadingContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : '#FFFFFF' }]}>
      <ActivityIndicator size="large" color={isDarkMode ? '#818cf8' : '#4F46E5'} />
    </View>
  );
};

const ErrorState = ({ message, onBack }) => {
  const { isDarkMode } = useTheme();
  return (
    <View style={[styles.errorContainer, { backgroundColor: isDarkMode ? '#1a1a1a' : '#FFFFFF' }]}>
      <Text style={[styles.errorText, { color: isDarkMode ? '#ef4444' : '#EF4444' }]}>{message}</Text>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Text style={[styles.backButtonText, { color: isDarkMode ? '#818cf8' : '#4F46E5' }]}>Go Back</Text>
      </Pressable>
    </View>
  );
};

const Header = ({ isEditing, onBack, onEdit, onSave, onCancel }) => {
  const { isDarkMode } = useTheme();
  return (
    <View style={[styles.header, { 
      backgroundColor: isDarkMode ? '#1a1a1a' : '#FFFFFF',
      borderBottomColor: isDarkMode ? '#2d2d2d' : '#E2E8F0'
    }]}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#e5e5e5' : '#1e293b'} />
      </Pressable>
      
      <View style={styles.headerRightButtons}>
        {isEditing ? (
          <>
            <Pressable 
              style={[styles.headerButton, styles.cancelButton, { 
                backgroundColor: isDarkMode ? '#2d2d2d' : '#F1F5F9' 
              }]} 
              onPress={onCancel}
            >
              <Text style={[styles.cancelButtonText, { color: isDarkMode ? '#9ca3af' : '#64748B' }]}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[styles.headerButton, styles.saveButton, { 
                backgroundColor: isDarkMode ? '#818cf8' : '#4F46E5' 
              }]} 
              onPress={onSave}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.headerButton} onPress={onEdit}>
            <Ionicons name="pencil" size={20} color={isDarkMode ? '#818cf8' : '#4F46E5'} />
            <Text style={[styles.editButtonText, { color: isDarkMode ? '#818cf8' : '#4F46E5' }]}>Edit</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const useNoteData = (id) => {
  const [note, setNote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadNoteDetails = async () => {
      try {
        const savedNotes = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedNotes) {
          const parsedNotes = JSON.parse(savedNotes);
          const foundNote = parsedNotes.find(note => note.id === id);
          
          if (foundNote) {
            setNote(foundNote);
          } else {
            setError('Note not found');
          }
        }
      } catch (error) {
        console.error('Error loading note details:', error);
        setError('Failed to load note details');
      } finally {
        setIsLoading(false);
      }
    };

    loadNoteDetails();
  }, [id]);

  const updateNote = async (updatedData) => {
    try {
      setIsLoading(true);
      const savedNotes = await AsyncStorage.getItem(STORAGE_KEY);
      if (!savedNotes) throw new Error('No notes found');
      
      const parsedNotes = JSON.parse(savedNotes);
      const updatedNotes = parsedNotes.map(n => 
        n.id === id ? { ...n, ...updatedData, lastEdited: new Date().toISOString() } : n
      );
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
      setNote(prev => ({ ...prev, ...updatedData, lastEdited: new Date().toISOString() }));
      return true;
    } catch (error) {
      console.error('Error saving note:', error);
      throw new Error('Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  };

  return { note, isLoading, error, updateNote };
};

export default function NoteDetails() {
  const { isDarkMode } = useTheme();
  const { id } = useLocalSearchParams();
  const { note, isLoading, error, updateNote } = useNoteData(id);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: ''
  });

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        content: note.content,
        category: note.category
      });
    }
  }, [note]);

  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      return;
    }

    try {
      await updateNote(formData);
      setIsEditing(false);
      Alert.alert('Success', 'Note updated successfully');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  }, [formData, updateNote]);

  const handleCancel = () => {
    setFormData({
      title: note.title,
      content: note.content,
      category: note.category
    });
    setIsEditing(false);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onBack={() => router.back()} />;
  if (!note) return <ErrorState message="Note not found" onBack={() => router.back()} />;

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1a1a1a' : '#FFFFFF' }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <Header 
        isEditing={isEditing}
        onBack={() => router.back()}
        onEdit={() => setIsEditing(true)}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      
      <ScrollView style={styles.contentContainer}>
        <View style={[styles.categoryBadge, { 
          backgroundColor: `${note.color}${isDarkMode ? '30' : '20'}`,
          borderColor: note.color 
        }]}>
          {isEditing ? (
            <TextInput
              style={[styles.categoryInput, { color: note.color }]}
              value={formData.category}
              onChangeText={(text) => setFormData(prev => ({ ...prev, category: text }))}
              placeholder="Category"
              placeholderTextColor={isDarkMode ? '#6b7280' : '#94A3B8'}
            />
          ) : (
            <Text style={[styles.categoryText, { color: note.color }]}>{note.category}</Text>
          )}
        </View>
        
        {isEditing ? (
          <TextInput
            style={[styles.titleInput, { color: isDarkMode ? '#e5e5e5' : '#1E293B' }]}
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder="Title"
            placeholderTextColor={isDarkMode ? '#6b7280' : '#94A3B8'}
          />
        ) : (
          <Text style={[styles.titleText, { color: isDarkMode ? '#e5e5e5' : '#1E293B' }]}>{note.title}</Text>
        )}
        
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={14} color={isDarkMode ? '#9ca3af' : '#64748B'} />
          <Text style={[styles.dateText, { color: isDarkMode ? '#9ca3af' : '#64748B' }]}>
            {new Date(note.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          {note.lastEdited && (
            <>
              <Text style={[styles.dateText, { color: isDarkMode ? '#9ca3af' : '#64748B' }]}> • Edited: </Text>
              <Text style={[styles.dateText, { color: isDarkMode ? '#9ca3af' : '#64748B' }]}>
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
            style={[styles.contentInput, { color: isDarkMode ? '#d1d5db' : '#334155' }]}
            value={formData.content}
            onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
            placeholder="Note content..."
            placeholderTextColor={isDarkMode ? '#6b7280' : '#94A3B8'}
            multiline
            textAlignVertical="top"
          />
        ) : (
          <Text style={[styles.contentText, { color: isDarkMode ? '#d1d5db' : '#334155' }]}>{note.content}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 35,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
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
  },
  saveButton: {
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
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
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
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
    marginLeft: 4,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    padding: 0,
    height: 300,
  },
});