import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo'
import { useRealm } from '@/components/RealmContext';
import { supabase } from '@/lib/supabase';

export default function SyncService({ userId }) {
  const realm = useRealm();
  const appState = useRef(AppState.currentState);
  const syncTimeoutRef = useRef(null);
  const initialSyncDoneRef = useRef(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const pendingSyncRequestRef = useRef(false);

  // Network connectivity monitoring
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

    if (!isOnline || !realm || !userId) {
      console.log('Cannot sync: offline or missing data', { isOnline, hasRealm: !!realm, userId });
      return;
    }

    try {
      setSyncInProgress(true);
      
      // First pull remote changes
      await syncFromSupabase();
      
      // Then push local changes
      await syncToSupabase();
      
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
    if (!realm || !userId) return;

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
      
      for (let i = 0; i < batches; i++) {
        const batchStart = i * batchSize;
        const batchEnd = Math.min((i + 1) * batchSize, unsyncedNotes.length);
        const currentBatch = unsyncedNotes.slice(batchStart, batchEnd);
        
        // Convert Realm objects to plain JS objects before processing
        // This helps avoid the "accessing deleted object" error
        const batchNotesData = currentBatch.map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          userId: note.userId,
          category: note.category,
          color: note.color,
          isDeleted: note.isDeleted,
          hardDeleted: note.hardDeleted
        }));
        
        const batchPromises = batchNotesData.map(async (noteData) => {
          // Check if this is a hard-deleted note
          if (noteData.hardDeleted === true) {
            // Actually delete from Supabase instead of updating
            const { error: deleteError } = await supabase
              .from('notes')
              .delete()
              .eq('id', noteData.id);
              
            if (deleteError) {
              console.error(`Error deleting note ${noteData.id} from Supabase:`, deleteError);
              return false;
            }
            
            // Find the original note in Realm and mark it as synced, then delete it
            try {
              realm.write(() => {
                const noteToDelete = realm.objectForPrimaryKey('Note', noteData.id);
                if (noteToDelete) {
                  // We need to delete it directly now that it's been deleted from Supabase
                  realm.delete(noteToDelete);
                }
              });
              
              console.log(`Note ${noteData.id} permanently deleted from Supabase and local Realm`);
              return true;
            } catch (e) {
              console.error(`Error deleting note ${noteData.id} from Realm:`, e);
              return false;
            }
          }
          
          // Regular sync flow for non-hard-deleted notes
          // First check if there's a newer version on the server
          const { data: remoteNote, error: fetchError } = await supabase
            .from('notes')
            .select('updated_at')
            .eq('id', noteData.id)
            .single();
            
          if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
            console.error(`Error checking remote note ${noteData.id}:`, fetchError);
            return false;
          }
          
          // If remote note exists and is newer, skip this update to avoid overwriting newer data
          if (remoteNote && new Date(remoteNote.updated_at) > noteData.updatedAt) {
            console.log(`Skipping note ${noteData.id} - remote version is newer`);
            return false;
          }
          
          // Convert data to Supabase format
          const supabaseNoteData = {
            id: noteData.id,
            title: noteData.title,
            content: noteData.content,
            created_at: noteData.createdAt.toISOString(),
            updated_at: noteData.updatedAt.toISOString(),
            user_id: noteData.userId,
            category: noteData.category,
            color: noteData.color,
            is_deleted: noteData.isDeleted,
          };

          try {
            // Upsert to Supabase
            const { error } = await supabase
              .from('notes')
              .upsert(supabaseNoteData);

            if (!error) {
              // Mark as synced in Realm
              realm.write(() => {
                const noteToUpdate = realm.objectForPrimaryKey('Note', noteData.id);
                if (noteToUpdate) {
                  noteToUpdate.isSynced = true;
                }
              });
              console.log(`Note ${noteData.id} synced successfully`);
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

  // Function to pull data from Supabase to Realm with smart sync
  const syncFromSupabase = async () => {
    if (!realm || !userId) return;

    try {
      console.log('Fetching notes from Supabase...');
      
      // For initial sync, get all notes
      // For subsequent syncs, use timestamp filtering for efficiency
      let query = supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId);
        
      // If not initial sync, only fetch notes updated after our last sync
      if (initialSyncDoneRef.current) {
        // Find the latest local timestamp
        let latestUpdateTimestamp = new Date(0);
        const localNotes = realm.objects('Note').filtered('userId == $0', userId);
        
        if (localNotes.length > 0) {
          localNotes.forEach(note => {
            if (note.updatedAt > latestUpdateTimestamp) {
              latestUpdateTimestamp = note.updatedAt;
            }
          });
          
          // Subtract 5 minutes to account for possible time differences
          latestUpdateTimestamp = new Date(latestUpdateTimestamp.getTime() - 5 * 60 * 1000);
          
          // Only get notes updated after this timestamp
          query = query.gte('updated_at', latestUpdateTimestamp.toISOString());
        }
      }
      
      const { data: remoteNotes, error } = await query;
      
      if (error) {
        console.error('Error fetching notes from Supabase:', error);
        throw error;
      }
      
      console.log(`Fetched ${remoteNotes.length} notes from Supabase`);
      
      // Process notes in batches
      const batchSize = 20;
      for (let i = 0; i < remoteNotes.length; i += batchSize) {
        const batch = remoteNotes.slice(i, i + batchSize);
        
        // Process batch in a single write transaction for better performance
        realm.write(() => {
          batch.forEach(remoteNote => {
            try {
              const remoteUpdatedAt = new Date(remoteNote.updated_at);
              const localNote = realm.objectForPrimaryKey('Note', remoteNote.id);
              
              if (!localNote) {
                // Note doesn't exist locally, create it
                realm.create('Note', {
                  id: remoteNote.id,
                  title: remoteNote.title,
                  content: remoteNote.content,
                  createdAt: new Date(remoteNote.created_at),
                  updatedAt: remoteUpdatedAt,
                  userId: remoteNote.user_id,
                  category: remoteNote.category || 'Notes',
                  color: remoteNote.color || '#4F46E5',
                  isDeleted: remoteNote.is_deleted,
                  isSynced: true,
                });
                console.log(`Created new local note from remote: ${remoteNote.id}`);
              } else {
                // Note exists locally, update it if the remote version is newer
                const localUpdatedAt = localNote.updatedAt;

                if (remoteUpdatedAt > localUpdatedAt) {
                  localNote.title = remoteNote.title;
                  localNote.content = remoteNote.content;
                  localNote.updatedAt = remoteUpdatedAt;
                  localNote.category = remoteNote.category || 'Notes';
                  localNote.color = remoteNote.color || '#4F46E5';
                  localNote.isDeleted = remoteNote.is_deleted;
                  localNote.isSynced = true;
                  console.log(`Updated local note from remote: ${remoteNote.id}`);
                } else if (localUpdatedAt > remoteUpdatedAt && !localNote.isSynced) {
                  console.log(`Local note ${remoteNote.id} is newer than remote, will be synced to server later`);
                }
              }
            } catch (e) {
              console.error(`Error processing remote note ${remoteNote.id}:`, e);
            }
          });
        });
      }
          
      initialSyncDoneRef.current = true;
      console.log('Pull sync completed');
    } catch (error) {
      console.error('Error syncing from Supabase:', error);
      throw error;
    }
  };
  
  // Run initial sync when component mounts
  useEffect(() => {
    if (!realm || !userId) return;
    
    console.log('Initial sync starting...');
    syncData();
    
    // Set up periodic sync every 30 seconds
    const intervalId = setInterval(() => {
      if (isOnline) {
        syncData();
      }
    }, 20000);
    
    return () => {
      clearInterval(intervalId);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [realm, userId, isOnline]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - sync from server
        console.log('App has come to the foreground, syncing data...');
        syncData();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to the background - sync to server
        console.log('App is going to the background, syncing data...');
        syncData();
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [realm, userId, isOnline]);

  // Set up Supabase realtime subscription
  useEffect(() => {
    if (!userId) return;
    
    // Subscribe to changes on the notes table for this user
    const subscription = supabase
      .channel('notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public', 
          table: 'notes',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Received change from Supabase:', payload);
          // Add a small delay to allow multiple changes to accumulate
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
          }
          
          syncTimeoutRef.current = setTimeout(() => {
            syncFromSupabase();
          }, 1000);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, isOnline]);

  // This component doesn't render anything visible
  return null;
}