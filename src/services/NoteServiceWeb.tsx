import { v4 as uuidv4 } from 'uuid';

export default class NoteServiceWeb {
  private supabase;
  private userId;
  private hardDeletedIds: Set<string>;
  private cachedNotes: any[];

  constructor(supabase, userId) {
    this.supabase = supabase;
    this.userId = userId;
    this.hardDeletedIds = new Set();
    this.cachedNotes = []; // In-memory cache of notes
    this.loadHardDeletedIds(); // Load hard-deleted IDs from localStorage
  }

  /**
   * Get all notes for the current user that are not deleted
   */
  async getAllNotes() {
    try {
      if (this.cachedNotes.length > 0) {
        return this.cachedNotes.filter(note => !note.isDeleted);
      }

      const { data, error } = await this.supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform Supabase data to match Realm format
      const notes = data.map(note => this._transformFromSupabase(note));
      this.cachedNotes = notes;
      
      return notes;
    } catch (error) {
      console.error('Error getting notes:', error);
      return [];
    }
  }

  /**
   * Get a specific note by ID
   */
  async getNoteById(noteId) {
    // Check cache first
    const cachedNote = this.cachedNotes.find(note => note.id === noteId);
    if (cachedNote) return cachedNote;

    try {
      const { data, error } = await this.supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (error) throw error;
      
      return this._transformFromSupabase(data);
    } catch (error) {
      console.error(`Error getting note ${noteId}:`, error);
      return null;
    }
  }
  
  /**
   * Toggle completion status for a note
   */
  async toggleCompletion(noteId, isCompleted) {
    try {
      const { error } = await this.supabase
        .from('notes')
        .update({ 
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (error) throw error;
      
      // Update cache
      this._updateNoteInCache(noteId, { isCompleted });
      
      return true;
    } catch (error) {
      console.error(`Error toggling completion for note ${noteId}:`, error);
      return false;
    }
  }

  /**
   * Create a new note
   */
  async createNote(title, content, category, color, isCompleted = false, dueDate = null, priority = 'medium', reminder = null) {
    const noteId = uuidv4();
    
    try {
      const noteData = {
        id: noteId,
        title: title || 'Untitled',
        content: content || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: this.userId,
        category: category || 'Tasks',
        color: color || '#059669',
        is_deleted: false,
        is_completed: isCompleted,
        due_date: dueDate?.toISOString() || null,
        priority: priority,
        reminder: reminder
      };

      const { error } = await this.supabase
        .from('notes')
        .insert(noteData);

      if (error) throw error;

      // Add to cache
      const newNote = this._transformFromSupabase(noteData);
      this.cachedNotes.unshift(newNote);
      
      return noteId;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  }

  /**
   * Update an existing note
   */
  async updateNote(noteId, updates) {
    try {
      // Convert to Supabase format
      const supabaseUpdates = {};
      if (updates.title !== undefined) supabaseUpdates.title = updates.title;
      if (updates.content !== undefined) supabaseUpdates.content = updates.content;
      if (updates.category !== undefined) supabaseUpdates.category = updates.category;
      if (updates.color !== undefined) supabaseUpdates.color = updates.color;
      if (updates.isCompleted !== undefined) supabaseUpdates.is_completed = updates.isCompleted;
      if (updates.dueDate !== undefined) supabaseUpdates.due_date = updates.dueDate?.toISOString() || null;
      if (updates.priority !== undefined) supabaseUpdates.priority = updates.priority;
      if (updates.reminder !== undefined) supabaseUpdates.reminder = updates.reminder;
      
      // Always update timestamp
      supabaseUpdates.updated_at = new Date().toISOString();

      const { error } = await this.supabase
        .from('notes')
        .update(supabaseUpdates)
        .eq('id', noteId);

      if (error) throw error;
      
      // Update cache
      this._updateNoteInCache(noteId, updates);
      
      return true;
    } catch (error) {
      console.error(`Error updating note ${noteId}:`, error);
      return false;
    }
  }

  /**
   * Delete a note (soft delete)
   */
  async deleteNote(noteId) {
    try {
      const { error } = await this.supabase
        .from('notes')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', noteId);

      if (error) throw error;
      
      // Update cache
      this._updateNoteInCache(noteId, { isDeleted: true });
      
      return true;
    } catch (error) {
      console.error(`Error deleting note ${noteId}:`, error);
      return false;
    }
  }

  /**
   * Hard delete a note (permanent removal)
   */
  async hardDeleteNote(noteId) {
    try {
      const { error } = await this.supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      
      // Add to set of hard-deleted IDs
      this.hardDeletedIds.add(noteId);
      
      // Remove from cache
      this.cachedNotes = this.cachedNotes.filter(note => note.id !== noteId);
      
      // Store hard deleted IDs in localStorage
      this._persistHardDeletedIds();
      
      return true;
    } catch (error) {
      console.error(`Error hard deleting note ${noteId}:`, error);
      return false;
    }
  }

  /**
   * Save hard-deleted IDs to localStorage
   */
  _persistHardDeletedIds() {
    if (typeof localStorage !== 'undefined') {
      const idsArray = Array.from(this.hardDeletedIds);
      localStorage.setItem(`hardDeletedNotes_${this.userId}`, JSON.stringify(idsArray));
    }
  }

  /**
   * Load hard-deleted IDs from localStorage
   */
  async loadHardDeletedIds() {
    if (typeof localStorage !== 'undefined') {
      const storedIds = localStorage.getItem(`hardDeletedNotes_${this.userId}`);
      if (storedIds) {
        const idsArray = JSON.parse(storedIds);
        this.hardDeletedIds = new Set(idsArray);
      }
    }
  }

  /**
   * Check if a note ID was hard-deleted
   */
  isHardDeleted(noteId) {
    return this.hardDeletedIds.has(noteId);
  }

  /**
   * Get all notes for a specific category
   */
  async getNotesByCategory(category) {
    try {
      // Try to use cache first
      if (this.cachedNotes.length > 0) {
        return this.cachedNotes.filter(note => 
          note.category === category && !note.isDeleted
        );
      }

      const { data, error } = await this.supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.userId)
        .eq('category', category)
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return data.map(note => this._transformFromSupabase(note));
    } catch (error) {
      console.error(`Error getting notes by category ${category}:`, error);
      return [];
    }
  }

  /**
   * Search notes by title or content
   */
  async searchNotes(query) {
    const searchQuery = query.toLowerCase();
    
    try {
      // If we have a complete cache, we can search in-memory
      if (this.cachedNotes.length > 0) {
        return this.cachedNotes.filter(note => 
          !note.isDeleted && 
          (note.title.toLowerCase().includes(searchQuery) || 
           note.content.toLowerCase().includes(searchQuery))
        );
      }

      // Otherwise, query Supabase
      const { data, error } = await this.supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_deleted', false)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return data.map(note => this._transformFromSupabase(note));
    } catch (error) {
      console.error(`Error searching notes for "${query}":`, error);
      return [];
    }
  }

  /**
   * Get completed notes
   */
  async getCompletedNotes() {
    try {
      // Try to use cache first
      if (this.cachedNotes.length > 0) {
        return this.cachedNotes.filter(note => 
          !note.isDeleted && note.isCompleted
        );
      }

      const { data, error } = await this.supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_deleted', false)
        .eq('is_completed', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return data.map(note => this._transformFromSupabase(note));
    } catch (error) {
      console.error('Error getting completed notes:', error);
      return [];
    }
  }

  /**
   * Get incomplete notes (tasks not yet completed)
   */
  async getIncompleteNotes() {
    try {
      // Try to use cache first
      if (this.cachedNotes.length > 0) {
        return this.cachedNotes.filter(note => 
          !note.isDeleted && !note.isCompleted
        );
      }

      const { data, error } = await this.supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_deleted', false)
        .eq('is_completed', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return data.map(note => this._transformFromSupabase(note));
    } catch (error) {
      console.error('Error getting incomplete notes:', error);
      return [];
    }
  }

  /**
   * Get notes by priority
   */
  async getNotesByPriority(priority) {
    try {
      // Try to use cache first
      if (this.cachedNotes.length > 0) {
        return this.cachedNotes.filter(note => 
          !note.isDeleted && note.priority === priority
        );
      }

      const { data, error } = await this.supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_deleted', false)
        .eq('priority', priority)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      return data.map(note => this._transformFromSupabase(note));
    } catch (error) {
      console.error(`Error getting notes by priority ${priority}:`, error);
      return [];
    }
  }

  /**
   * Get notes with due dates approaching
   * @param {number} daysThreshold - Number of days to consider "approaching"
   */
  async getApproachingDueDates(daysThreshold = 3) {
    const now = new Date();
    const thresholdDate = new Date(now);
    thresholdDate.setDate(now.getDate() + daysThreshold);
    
    try {
      // Use cache if possible
      if (this.cachedNotes.length > 0) {
        return this.cachedNotes.filter(note => 
          !note.isDeleted && 
          !note.isCompleted && 
          note.dueDate && 
          new Date(note.dueDate) <= thresholdDate
        ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      }

      const { data, error } = await this.supabase
        .from('notes')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_deleted', false)
        .eq('is_completed', false)
        .lte('due_date', thresholdDate.toISOString())
        .order('due_date', { ascending: true });

      if (error) throw error;
      
      return data.map(note => this._transformFromSupabase(note));
    } catch (error) {
      console.error('Error getting approaching due dates:', error);
      return [];
    }
  }

  /**
   * Helper method to transform Supabase response to match Realm format
   */
  _transformFromSupabase(supabaseNote) {
    return {
      id: supabaseNote.id,
      title: supabaseNote.title || 'Untitled',
      content: supabaseNote.content || '',
      createdAt: new Date(supabaseNote.created_at),
      updatedAt: new Date(supabaseNote.updated_at),
      userId: supabaseNote.user_id,
      category: supabaseNote.category || 'Tasks',
      color: supabaseNote.color || '#4F46E5',
      isDeleted: supabaseNote.is_deleted || false,
      isSynced: true, // Always synced in web version
      isCompleted: supabaseNote.is_completed || false,
      dueDate: supabaseNote.due_date ? new Date(supabaseNote.due_date) : null,
      priority: supabaseNote.priority || 'medium',
      reminder: supabaseNote.reminder || null
    };
  }

  /**
   * Helper method to update a note in the cache
   */
  _updateNoteInCache(noteId, updates) {
    const noteIndex = this.cachedNotes.findIndex(note => note.id === noteId);
    if (noteIndex !== -1) {
      this.cachedNotes[noteIndex] = {
        ...this.cachedNotes[noteIndex],
        ...updates,
        updatedAt: new Date()
      };
    }
  }

  /**
   * Clear cache to force fresh data fetch
   */
  clearCache() {
    this.cachedNotes = [];
  }
}