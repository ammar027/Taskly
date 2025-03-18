import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRealm } from '@/components/RealmContext';
import { useAuth } from '@/components/AuthContext';
import { useTheme } from '@/components/ThemeContext';

const SyncStatusIndicator = () => {
  const { user } = useAuth();
  const realm = useRealm();
  const { isDarkMode } = useTheme();
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'error', 'success'
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const pulseAnim = new Animated.Value(1);

  // Start pulsing animation
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Stop pulsing animation
  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  // Monitor unsynced notes count
  useEffect(() => {
    if (!realm || !user) return;

    // Initial count
    const updateUnsyncedCount = () => {
      try {
        const count = realm.objects('Note')
          .filtered('userId == $0 && isSynced == false', user.id)
          .length;
        
        setUnsyncedCount(count);
        
        // Update status based on count
        if (count > 0) {
          setSyncStatus('syncing');
          startPulse();
        } else {
          setSyncStatus('success');
          stopPulse();
          // Reset to idle after showing success for 2 seconds
          setTimeout(() => {
            setSyncStatus('idle');
          }, 2000);
        }
      } catch (error) {
        console.error('Error counting unsynced notes', error);
        setSyncStatus('error');
        stopPulse();
      }
    };

    // Set up listener for changes to Note objects
    const notesCollection = realm.objects('Note').filtered('userId == $0', user.id);
    notesCollection.addListener(updateUnsyncedCount);

    // Initial update
    updateUnsyncedCount();

    // Clean up listener
    return () => {
      if (notesCollection.isValid()) {
        notesCollection.removeListener(updateUnsyncedCount);
      }
      stopPulse();
    };
  }, [realm, user]);

  // If no unsynced notes and idle, don't show anything
  if (syncStatus === 'idle' && unsyncedCount === 0) {
    return null;
  }

  // Get color based on status and theme
  const getColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return '#4F46E5'; // Indigo
      case 'error':
        return '#EF4444'; // Red
      case 'success':
        return '#10B981'; // Green
      default:
        return isDarkMode ? '#6b7280' : '#64748b'; // Gray
    }
  };

  // Render icon based on status
  const getIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Ionicons name="sync" size={16} color={getColor()} />
          </Animated.View>
        );
      case 'error':
        return <Ionicons name="alert-circle" size={16} color={getColor()} />;
      case 'success':
        return <Ionicons name="checkmark-circle" size={16} color={getColor()} />;
      default:
        return null;
    }
  };

  // Render status text
  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return `Syncing ${unsyncedCount} ${unsyncedCount === 1 ? 'note' : 'notes'}`;
      case 'error':
        return 'Sync error';
      case 'success':
        return 'All synced';
      default:
        return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
      {getIcon()}
      <Text style={[styles.statusText, { color: getColor() }]}>{getStatusText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default SyncStatusIndicator;