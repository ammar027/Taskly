import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import 'react-native-get-random-values';
import { supabase } from '@/lib/supabase';
import { useRealm } from '@/realm/RealmContext';

export default function TasklySync({ userId }) {
  const realm = useRealm();
  const appState = useRef(AppState.currentState);
  const syncTimeoutRef = useRef(null);
  const initialSyncDoneRef = useRef(false);

  // Function to sync local tasks to Supabase
  const syncToSupabase = async () => {
    if (!realm || !userId) return;

    try {
      // Get all unsynced tasks
      const unsyncedTasks = realm.objects('Task').filtered('isSynced == false && userId == $0', userId);
      
      if (unsyncedTasks.length === 0) return;

      // Process each task
      for (const task of unsyncedTasks) {
        // Convert Realm object to plain object
        const taskData = {
          id: task.id,
          title: task.title,
          description: task.description,
          due_date: task.dueDate ? task.dueDate.toISOString() : null,
          priority: task.priority,
          status: task.status,
          created_at: task.createdAt.toISOString(),
          updated_at: task.updatedAt.toISOString(),
          user_id: task.userId,
          is_deleted: task.isDeleted,
          category_id: task.categoryId,
          completed_at: task.completedAt ? task.completedAt.toISOString() : null,
        };

        try {
          // Upsert to Supabase
          const { error } = await supabase
            .from('tasks')
            .upsert(taskData);

          if (!error) {
            // Mark as synced in Realm
            realm.write(() => {
              task.isSynced = true;
            });
          } else {
            console.error('Supabase sync error:', error);
          }
        } catch (e) {
          console.error('Sync error:', e);
        }
      }

      // Sync categories
      const unsyncedCategories = realm.objects('Category').filtered('isSynced == false && userId == $0', userId);
      
      for (const category of unsyncedCategories) {
        const categoryData = {
          id: category.id,
          name: category.name,
          color: category.color,
          created_at: category.createdAt.toISOString(),
          updated_at: category.updatedAt.toISOString(),
          user_id: category.userId,
          is_deleted: category.isDeleted,
        };

        try {
          const { error } = await supabase
            .from('categories')
            .upsert(categoryData);

          if (!error) {
            realm.write(() => {
              category.isSynced = true;
            });
          } else {
            console.error('Supabase category sync error:', error);
          }
        } catch (e) {
          console.error('Category sync error:', e);
        }
      }
    } catch (error) {
      console.error('Error during sync:', error);
    }
  };

  // Function to pull data from Supabase to Realm
  const syncFromSupabase = async () => {
    if (!realm || !userId) return;

    // If we haven't initialized the initialSyncDoneRef yet, check if we have any local tasks
    if (!initialSyncDoneRef.current) {
      const localTasks = realm.objects('Task').filtered('userId == $0', userId);
      if (localTasks.length > 0) {
        initialSyncDoneRef.current = true;
      }
    }

    try {
      // Fetch categories first
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);

      if (categoryError) {
        console.error('Supabase category fetch error:', categoryError);
      } else if (categoryData && categoryData.length > 0) {
        // Update local categories
        realm.write(() => {
          categoryData.forEach((remoteCategory) => {
            const localCategory = realm.objectForPrimaryKey('Category', remoteCategory.id);
            
            if (localCategory) {
              // Update existing category if remote is newer
              const remoteUpdatedAt = new Date(remoteCategory.updated_at);
              if (remoteUpdatedAt > localCategory.updatedAt) {
                localCategory.name = remoteCategory.name;
                localCategory.color = remoteCategory.color;
                localCategory.updatedAt = remoteUpdatedAt;
                localCategory.isDeleted = remoteCategory.is_deleted;
                localCategory.isSynced = true;
              }
            } else {
              // Create new category
              realm.create('Category', {
                id: remoteCategory.id,
                name: remoteCategory.name,
                color: remoteCategory.color,
                createdAt: new Date(remoteCategory.created_at),
                updatedAt: new Date(remoteCategory.updated_at),
                userId: remoteCategory.user_id,
                isDeleted: remoteCategory.is_deleted,
                isSynced: true,
              });
            }
          });
        });
      }

      // Fetch tasks
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (taskError) {
        console.error('Supabase task fetch error:', taskError);
        return;
      }

      if (!taskData || taskData.length === 0) return;

      // Update local Realm database
      realm.write(() => {
        taskData.forEach((remoteTask) => {
          // Check if task exists locally
          const localTask = realm.objectForPrimaryKey('Task', remoteTask.id);
          
          if (localTask) {
            // Update existing task if remote is newer
            const remoteUpdatedAt = new Date(remoteTask.updated_at);
            if (remoteUpdatedAt > localTask.updatedAt) {
              localTask.title = remoteTask.title;
              localTask.description = remoteTask.description;
              localTask.dueDate = remoteTask.due_date ? new Date(remoteTask.due_date) : null;
              localTask.priority = remoteTask.priority;
              localTask.status = remoteTask.status;
              localTask.updatedAt = remoteUpdatedAt;
              localTask.isDeleted = remoteTask.is_deleted;
              localTask.categoryId = remoteTask.category_id;
              localTask.completedAt = remoteTask.completed_at ? new Date(remoteTask.completed_at) : null;
              localTask.isSynced = true;
            }
          } else {
            // Create new task
            realm.create('Task', {
              id: remoteTask.id,
              title: remoteTask.title,
              description: remoteTask.description,
              dueDate: remoteTask.due_date ? new Date(remoteTask.due_date) : null,
              priority: remoteTask.priority,
              status: remoteTask.status,
              createdAt: new Date(remoteTask.created_at),
              updatedAt: new Date(remoteTask.updated_at),
              userId: remoteTask.user_id,
              isDeleted: remoteTask.is_deleted,
              categoryId: remoteTask.category_id,
              completedAt: remoteTask.completed_at ? new Date(remoteTask.completed_at) : null,
              isSynced: true,
            });
          }
        });
      });
      
      // Mark that we've completed a sync
      initialSyncDoneRef.current = true;
    } catch (error) {
      console.error('Error during fetch from Supabase:', error);
    }
  };

  // Set up Supabase realtime subscription
  useEffect(() => {
    if (!userId) return;

    // Subscribe to changes in the tasks table
    const taskSubscription = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        }, 
        () => {
          // When we receive a change, sync from Supabase
          syncFromSupabase();
        }
      )
      .subscribe();

    // Subscribe to changes in the categories table
    const categorySubscription = supabase
      .channel('categories_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'categories',
          filter: `user_id=eq.${userId}`
        }, 
        () => {
          // When we receive a change, sync from Supabase
          syncFromSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskSubscription);
      supabase.removeChannel(categorySubscription);
    };
  }, [userId]);

  // Set up app state change handler for background sync
  useEffect(() => {
    // Wait a few seconds before starting the periodic sync to avoid
    // conflict with the HomeScreen's initial sync
    const initialSyncDelay = setTimeout(() => {
      // Initial sync
      syncFromSupabase();
      
      // Set up periodic sync (every 30 seconds)
      syncTimeoutRef.current = setInterval(() => {
        syncToSupabase();
      }, 30000);
    }, 5000); // 5 second delay

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground, sync data
        syncFromSupabase();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background, sync local changes
        syncToSupabase();
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      clearTimeout(initialSyncDelay);
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, [userId]);

  return null; // This component doesn't render anything
}