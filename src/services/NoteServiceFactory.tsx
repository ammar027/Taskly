import { Platform } from 'react-native';
import NoteServiceRealm from './NoteServiceRealm'; // Your existing Realm implementation
import NoteServiceWeb from './NoteServiceWeb'; // New web implementation

export function createNoteService(realm, userId, supabase) {
  if (Platform.OS === 'web') {
    return new NoteServiceWeb(supabase, userId);
  } else {
    return new NoteServiceRealm(realm, userId);
  }
}