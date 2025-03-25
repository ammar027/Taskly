import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CreateNoteModal = ({ visible, onClose, onSave, theme }) => {  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState("Tasks");

  const handleSave = () => {
    if (!title.trim() && !content.trim()) {
      // Don't save empty notes
      onClose();
      return;
    }
    
    onSave({
      title: title.trim() || 'Untitled',
      content: content.trim(),
      category,
      color: '#4F46E5', // Default color
    });
    
    // Reset form
    setTitle('');
    setContent('');
    setCategory('Tasks');
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
      onDismiss={() => StatusBar.setHidden(false, "fade")}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={[styles.modalView, { 
          backgroundColor: theme.cardBackground,
          borderColor: theme.borderColor,
        }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Create New Task</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textColor} />
            </Pressable>
          </View>
          
          <View style={styles.formContainer}>
            <TextInput
              style={[styles.titleInput, { 
                color: theme.textColor,
                borderBottomColor: theme.borderColor,
              }]}
              placeholder="Title"
              placeholderTextColor={theme.mutedTextColor}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
            
            <TextInput
              style={[styles.contentInput, { 
                color: theme.textColor,
                backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              }]}
              placeholder="Type your description..."
              placeholderTextColor={theme.mutedTextColor}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline-outline" size={16} color="#EF4444" />
            <Text style={styles.offlineText}>Offline Mode - Note will be synced when connection is restored</Text>
          </View>
          
          <View style={styles.actionButtons}>
            <Pressable
              style={[styles.cancelButton, { borderColor: theme.borderColor }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.textColor }]}>Cancel</Text>
            </Pressable>
            
            <Pressable
              style={[styles.saveButton, { 
                backgroundColor: theme.isDarkMode ? 'rgb(27, 24, 95)' : 'rgb(78, 70, 229)',
                opacity: (!title.trim() && !content.trim()) ? 0.5 : 1
              }]}
              onPress={handleSave}
              disabled={!title.trim() && !content.trim()}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalView: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 5,
  },
  formContainer: {
    marginBottom: 20,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '500',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 15,
  },
  contentInput: {
    fontSize: 16,
    padding: 15,
    borderRadius: 10,
    height: 150,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  offlineText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#EF4444',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

export default CreateNoteModal;