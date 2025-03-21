import React from 'react';
import { Platform } from 'react-native';
import SyncService from './SyncService'; // Original sync service
import SyncServiceWeb from './SyncServiceWeb'; // Web-specific sync service

export default function PlatformSyncService({ userId, noteService, isOnline }) {
  if (Platform.OS === 'web') {
    return <SyncServiceWeb userId={userId} noteService={noteService} />;
  } else {
    return <SyncService userId={userId} />;
  }
}