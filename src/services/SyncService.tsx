import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useRealm } from '@/components/RealmContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthContext'; // Import useAuth

export default function SyncService({ userId }) {
  const realm = useRealm();
  const { isOnline: authIsOnline } = useAuth(); // Get online status from AuthContext
  const appState = useRef(AppState.currentState);
  const syncTimeoutRef = useRef(null);
  const initialSyncDoneRef = useRef(false);
  const [isOnline, setIsOnline] = useState(true);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const pendingSyncRequestRef = useRef(false);
  const lastSyncAttemptRef = useRef(0);
  const syncRetryTimeoutRef = useRef(null);

  // Network connectivity monitoring
  useEffect(() => {
    // Initial network check
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected && state.isInternetReachable !== false);
    });

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const nowOnline = state.isConnected && state.isInternetReachable !== false;
      
      setIsOnline(nowOnline);
      
      // If coming back online and we have pending changes, trigger sync
      if (wasOffline && nowOnline) {
        console.log('Network reconnected - triggering sync');
        // Add a short delay to allow network to stabilize
        setTimeout(() => syncData(), 2000);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOnline]);

  // Master sync function that coordinates both directions
  const syncData = async () => {
    // First, check conditions that would prevent sync
    if (syncInProgress) {
      // If sync is already in progress, flag for another sync when done
      console.log('Sync already in progress, queueing request');
      pendingSyncRequestRef.current = true;
      return;
    }

    // Ensure we have the prerequisites for syncing
    if (!realm || !userId) {
      console.log('Cannot sync: missing realm or userId', { hasRealm: !!realm, userId });
      return;
    }

    // Check network connectivity before attempting sync
    const currentConnectionState = await NetInfo.fetch();
    const actuallyOnline = currentConnectionState.isConnected && 
                          currentConnectionState.isInternetReachable !== false;
    
    if (!actuallyOnline) {
      console.log('Cannot sync: device is offline');
      
      // Schedule a retry if we haven't tried too recently
      const now = Date.now();
      const timeSinceLastAttempt = now - lastSyncAttemptRef.current;
      
      if (timeSinceLastAttempt > 60000) { // Only retry if more than 1 minute since last attempt
        if (syncRetryTimeoutRef.current) {
          clearTimeout(syncRetryTimeoutRef.current);
        }
        
        syncRetryTimeoutRef.current = setTimeout(() => {
          console.log('Attempting sync retry...');
          syncData();
        }, 60000); // Retry in 1 minute
      }
      
      return;
    }
    
    // Update last attempt timestamp
    lastSyncAttemptRef.current = Date.now();

    try {
      setSyncInProgress(true);
      
      // First pull remote changes
      await syncFromSupabase();
      
      // Then push local changes
      await syncToSupabase();
      
      console.log('Sync completed successfully');
      initialSyncDoneRef.current = true;
    } catch (error) {
      console.log('Sync failed:', error.message || 'Unknown error');
      
      // If it's a network error, don't log the full stack trace
      if (!error.message?.includes('Network request failed')) {
        console.error('Detailed sync error:', error);
      }
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
    if (!realm || !userId || !isOnline) return;

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
          hardDeleted: note.hardDeleted,
          isCompleted: note.isCompleted
        }));
        
        const batchPromises = batchNotesData.map(async (noteData) => {
          // Check if this is a hard-deleted note
          if (noteData.hardDeleted === true) {
            try {
              // Actually delete from Supabase instead of updating
              const { error: deleteError } = await supabase
                .from('notes')
                .delete()
                .eq('id', noteData.id);
                
              if (deleteError) {
                console.log(`Error deleting note ${noteData.id} from Supabase:`, deleteError.message);
                return false;
              }
              
              // Find the original note in Realm and mark it as synced, then delete it
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
              console.log(`Error deleting note ${noteData.id}:`, e.message);
              return false;
            }
          }
          
          // Regular sync flow for non-hard-deleted notes
          try {
            // First check if there's a newer version on the server
            const { data: remoteNote, error: fetchError } = await supabase
              .from('notes')
              .select('updated_at')
              .eq('id', noteData.id)
              .single();
              
            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
              console.log(`Error checking remote note ${noteData.id}:`, fetchError.message);
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
              is_completed: noteData.isCompleted,
            };

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
              console.log('Supabase sync error:', error.message);
              return false;
            }
          } catch (e) {
            console.log('Sync error:', e.message);
            return false;
          }
        });
        
        await Promise.all(batchPromises);
      }
      
      console.log('Push sync completed');
    } catch (error) {
      console.log('Error during sync to Supabase:', error.message);
      throw error; // Re-throw to be caught by the main sync function
    }
  };

  // Function to pull data from Supabase to Realm with smart sync
  const syncFromSupabase = async () => {
    if (!realm || !userId || !isOnline) return;

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
      
      // Check connection again right before making the request
      const connectionState = await NetInfo.fetch();
      if (!connectionState.isConnected) {
        throw new Error('Network connectivity lost before fetching');
      }
      
      const { data: remoteNotes, error } = await query;
      
      if (error) {
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
                  isCompleted: remoteNote.is_completed || false,
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
                  localNote.isCompleted = remoteNote.is_completed || false;
                  localNote.isSynced = true;
                  console.log(`Updated local note from remote: ${remoteNote.id}`);
                } else if (localUpdatedAt > remoteUpdatedAt && !localNote.isSynced) {
                  console.log(`Local note ${remoteNote.id} is newer than remote, will be synced to server later`);
                }
              }
            } catch (e) {
              console.log(`Error processing remote note ${remoteNote.id}:`, e.message);
            }
          });
        });
      }
      
      console.log('Pull sync completed');
    } catch (error) {
      if (error.message?.includes('Network')) {
        console.log('Network error during pull sync - will retry later');
      } else {
        console.log('Error syncing from Supabase:', error.message);
      }
      throw error;
    }
  };
  
  // Run initial sync when component mounts, accounting for online status
  useEffect(() => {
    if (!realm || !userId) return;
    
    // Function to safely start initial sync with retry logic
    const attemptInitialSync = async () => {
      console.log('Initial sync starting...');
      
      // Check if we're actually online
      const connectionState = await NetInfo.fetch();
      if (connectionState.isConnected && connectionState.isInternetReachable !== false) {
        syncData();
        
        // Set up periodic sync every 20 seconds when online
        const intervalId = setInterval(() => {
          NetInfo.fetch().then(state => {
            if (state.isConnected) {
              syncData();
            }
          });
        }, 30000);
        
        return intervalId;
      } else {
        console.log('Device offline - scheduling initial sync retry');
        // Try again in 30 seconds
        return setTimeout(attemptInitialSync, 50000);
      }
    };
    
    // Start the initial sync process
    const timerId = attemptInitialSync();
    
    return () => {
      clearInterval(timerId);
      clearTimeout(timerId);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      if (syncRetryTimeoutRef.current) {
        clearTimeout(syncRetryTimeoutRef.current);
      }
    };
  }, [realm, userId]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground - sync from server if online
        console.log('App has come to the foreground, checking connectivity...');
        NetInfo.fetch().then(state => {
          if (state.isConnected) {
            console.log('Online - triggering sync');
            syncData();
          } else {
            console.log('Offline - skipping sync');
          }
        });
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App is going to the background - sync to server if online
        console.log('App is going to the background, checking connectivity...');
        NetInfo.fetch().then(state => {
          if (state.isConnected) {
            console.log('Online - triggering sync');
            syncData();
          } else {
            console.log('Offline - skipping sync');
          }
        });
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [realm, userId]);

  // Set up Supabase realtime subscription only when online
  useEffect(() => {
    if (!userId || !isOnline) return;
    
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
            NetInfo.fetch().then(state => {
              if (state.isConnected) {
                syncFromSupabase();
              }
            });
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