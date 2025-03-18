import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo'
import { useRealm } from '@/components/RealmContext';
import { supabase } from '@/lib/supabase';

export default function SyncService({ userId, noteService }) {
  const realm = useRealm();
  const appState = useRef(AppState.currentState);
  const syncTimeoutRef = useRef(null);
  const initialSyncDoneRef = useRef(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const pendingSyncRequestRef = useRef(false);

  // Network connectivity monitoring (unchanged)
  useEffect(() => {
    // Initial network check
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected);
    });

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      setIsOnline(state.isConnected);
      
      // If coming back online and we have pending changes, trigger sync
      if (wasOffline && state.isConnected) {
        console.log('Network reconnected - triggering sync');
        syncData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOnline]);

  // Master sync function that coordinates both directions
  const syncData = async () => {
    if (syncInProgress) {
      // If sync is already in progress, flag for another sync when done
      console.log('Sync already in progress, queueing request');
      pendingSyncRequestRef.current = true;
      return;
    }

    if (!isOnline || !realm || !userId || !noteService.current) {
      console.log('Cannot sync: offline or missing data', { 
        isOnline, 
        hasRealm: !!realm, 
        userId,
        hasNoteService: !!noteService.current 
      });
      return;
    }

    try {
      setSyncInProgress(true);
      
      // First pull remote changes
      await syncFromSupabase();
      
      // Then push local changes
      await syncToSupabase();
      
      // Clean up hard-deleted notes that have been synced
      noteService.current.purgeHardDeletedNotes();
      
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncInProgress(false);
      
      // If another sync was requested during this one, trigger it now
      if (pendingSyncRequestRef.current) {
        pendingSyncRequestRef.current = false;
        // Small delay to prevent immediate re-sync
        setTimeout(() => syncData(), 1000);
      }
    }
  };

  // Function to sync local data to Supabase with conflict resolution
  const syncToSupabase = async () => {
    if (!realm || !userId || !noteService.current) return;

    try {
      // Get all unsynced notes
      const unsyncedNotes = realm.objects('Note').filtered('isSynced == false && userId == $0', userId);
      
      if (unsyncedNotes.length === 0) {
        console.log('No unsynced notes to push to server');
        return;
      }
      
      console.log(`Syncing ${unsyncedNotes.length} notes to Supabase...`);

      // Process each note in batches for better performance
      const batchSize = 10;
      const batches = Math.ceil(unsyncedNotes.length / batchSize);
      
      // First handle hard-deleted notes separately
      const hardDeletedNotes = unsyncedNotes.filtered('hardDeleted == true');
      console.log(`Found ${hardDeletedNotes.length} hard-deleted notes to process`);
      
      // Create a safe array of IDs to delete, so we don't access invalid objects later
      const hardDeletedIds = hardDeletedNotes.map(note => note.id);
      
      // Process hard deletes first
      for (const noteId of hardDeletedIds) {
        // Find the note - it might still exist in Realm at this point
        const note = realm.objectForPrimaryKey('Note', noteId);
        
        // Skip if already deleted from Realm
        if (!note) continue;
        
        // Delete from Supabase
        const { error: deleteError } = await supabase
          .from('notes')
          .delete()
          .eq('id', noteId);
          
        if (deleteError) {
          console.error(`Error deleting note ${noteId} from Supabase:`, deleteError);
          continue;
        }
        
        // Mark as synced in Realm - but don't delete yet
        realm.write(() => {
          note.isSynced = true;
        });
        
        console.log(`Note ${noteId} marked for permanent deletion`);
      }
      
      // Now process regular notes
      const regularNotes = unsyncedNotes.filtered('hardDeleted == false || hardDeleted == null');
      
      for (let i = 0; i < batches; i++) {
        const batchStart = i * batchSize;
        const batchEnd = Math.min((i + 1) * batchSize, regularNotes.length);
        const currentBatch = regularNotes.slice(batchStart, batchEnd);
        
        const batchPromises = currentBatch.map(async (note) => {
          // Skip if it's a hard-deleted note (we already processed these)
          if (note.hardDeleted === true) return false;
          
          // Regular sync flow for non-hard-deleted notes
          // First check if there's a newer version on the server
          const { data: remoteNote, error: fetchError } = await supabase
            .from('notes')
            .select('updated_at')
            .eq('id', note.id)
            .single();
            
          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
            console.error(`Error checking remote note ${note.id}:`, fetchError);
            return false;
          }
          
          // If remote note exists and is newer, skip this update to avoid overwriting newer data
          if (remoteNote && new Date(remoteNote.updated_at) > note.updatedAt) {
            console.log(`Skipping note ${note.id} - remote version is newer`);
            return false;
          }
          
          // Convert Realm object to plain object
          const noteData = {
            id: note.id,
            title: note.title,
            content: note.content,
            created_at: note.createdAt.toISOString(),
            updated_at: note.updatedAt.toISOString(),
            user_id: note.userId,
            category: note.category,
            color: note.color,
            is_deleted: note.isDeleted,
          };

          try {
            // Upsert to Supabase
            const { error } = await supabase
              .from('notes')
              .upsert(noteData);

            if (!error) {
              // Mark as synced in Realm
              realm.write(() => {
                note.isSynced = true;
              });
              console.log(`Note ${note.id} synced successfully`);
              return true;
            } else {
              console.error('Supabase sync error:', error);
              return false;
            }
          } catch (e) {
            console.error('Sync error:', e);
            return false;
          }
        });
        
        await Promise.all(batchPromises);
      }
      
      console.log('Push sync completed');
    } catch (error) {
      console.error('Error during sync to Supabase:', error);
      throw error; // Re-throw to be caught by the main sync function
    }
  };

  // syncFromSupabase function remains unchanged
  const syncFromSupabase = async () => {
    // ... (existing function code)
  };
  
  // Rest of component remains unchanged
}