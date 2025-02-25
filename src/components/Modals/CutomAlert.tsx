import React, { useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useTheme } from '@/components/ThemeContext';

const CustomAlert = ({ visible, title, message, onCancel, onDelete }) => {
  const { isDarkMode } = useTheme();
  


  // Define theme colors
  const themeColors = {
    overlay: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
    background: isDarkMode ? '#121212' : 'white',
    title: isDarkMode ? '#ffffff' : '#202124',
    message: isDarkMode ? '#e0e0e0' : '#333333',
    cancelButtonBg: isDarkMode ? '#2c2c2c' : '#F1F3F4',
    cancelButtonText: isDarkMode ? '#8ab4f8' : '#4285F4',
    deleteButtonBg: isDarkMode ? '#c62828' : '#EA4335',
    deleteButtonText: isDarkMode ? '#ffffff' : 'white',
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent={true}
    >
      <View style={[styles.overlay, { 
        paddingTop: StatusBar.currentHeight,
        backgroundColor: themeColors.overlay
      }]}>
        <View style={[styles.alertContainer, { 
          backgroundColor: themeColors.background
        }]}>
          <Text style={[styles.titleText, { 
            color: themeColors.title 
          }]}>{title}</Text>
          <Text style={[styles.messageText, { 
            color: themeColors.message 
          }]}>{message}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, { 
                backgroundColor: themeColors.cancelButtonBg 
              }]} 
              onPress={() => {
                StatusBar.setHidden(false, 'fade');
                onCancel();
              }}
            >
              <Text style={[styles.cancelButtonText, { 
                color: themeColors.cancelButtonText 
              }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.deleteButton, { 
                backgroundColor: themeColors.deleteButtonBg 
              }]} 
              onPress={() => {
                StatusBar.setHidden(false, 'fade');
                onDelete();
              }}
            >
              <Text style={[styles.deleteButtonText, { 
                color: themeColors.deleteButtonText 
              }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: '85%',
    borderRadius: 10,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  titleText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {},
  deleteButton: {},
  cancelButtonText: {
    fontWeight: '500',
  },
  deleteButtonText: {
    fontWeight: 'bold',
  },
});

export default CustomAlert;