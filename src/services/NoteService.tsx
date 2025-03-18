import { v4 as uuidv4 } from 'uuid';

// Fallback implementation for environments without crypto.getRandomValues()
// Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where x is any hex digit and y is 8, 9, a, or b
function generateFallbackUuid() {
  const hexChars = '0123456789abcdef';
  const yChars = '89ab'; // For the variant (8, 9, a, or b)
  
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4'; // Version 4
    } else if (i === 19) {
      uuid += yChars[Math.floor(Math.random() * 4)]; // Variant
    } else {
      uuid += hexChars[Math.floor(Math.random() * 16)];
    }
  }
  return uuid;
}

export default class NoteService {
  constructor(realm, userId) {
    this.realm = realm;
    this.userId = userId;
    this.hardDeletedIds = new Set();
  }

  /**
   * Get all notes for the current user that are not deleted
   */
  getAllNotes() {
    return this.realm.objects('Note').filtered('userId == $0 && isDeleted == false', this.userId).sorted('updatedAt', true);
  }

  /**
   * Get a specific note by ID
   */
  getNoteById(noteId) {
    return this.realm.objectForPrimaryKey('Note', noteId);
  }

  /**
   * Create a new note
   */
  createNote(title, content, category = 'Notes', color = '#4F46E5') {
    let noteId;
    
    try {
      // Try to use UUID v4
      noteId = uuidv4();
    } catch (error) {
      // Fallback to UUID-format string if native UUID fails
      console.log('UUID generation failed, using fallback UUID method');
      noteId = generateFallbackUuid();
    }
    
    this.realm.write(() => {
      this.realm.create('Note', {
        id: noteId,
        title: title || 'Untitled',
        content: content || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: this.userId,
        category: category,
        color: color,
        isDeleted: false,
        isSynced: false, // Mark as not synced initially
      });
    });
    
    return noteId;
  }

  /**
   * Create a note with a predefined ID
   * If the ID is not in UUID format, it will be converted to UUID format first
   */
  createNoteWithId(noteId, title, content, category = 'Notes', color = '#4F46E5', createdAt = new Date()) {
    // Check if noteId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(noteId)) {
      console.log('Converting non-UUID ID to UUID format');
      // Use the original ID as a seed for a deterministic UUID
      const seed = String(noteId);
      let uuid = '10000000-1000-4000-8000-100000000000';
      
      // Replace characters in the template UUID with characters from the seed
      let seedIndex = 0;
      let newUuid = '';
      for (let i = 0; i < uuid.length; i++) {
        if (uuid[i] === '-') {
          newUuid += '-';
        } else if (uuid[i] === '4') {
          // Keep version 4
          newUuid += '4';
        } else if (uuid[i] === '8') {
          // Keep variant bit
          newUuid += '8';
        } else if (seedIndex < seed.length) {
          // Use seed characters when available
          let hexChar = parseInt(seed[seedIndex++], 16);
          if (isNaN(hexChar)) {
            // If not a hex character, use a numeric representation
            hexChar = parseInt(seed.charCodeAt(seedIndex - 1) % 16);
          }
          newUuid += hexChar.toString(16);
        } else {
          // Fall back to random hex digits
          newUuid += '0123456789abcdef'[Math.floor(Math.random() * 16)];
        }
      }
      noteId = newUuid;
    }
    
    this.realm.write(() => {
      this.realm.create('Note', {
        id: noteId,
        title: title || 'Untitled',
        content: content || '',
        createdAt: createdAt,
        updatedAt: new Date(),
        userId: this.userId,
        category: category,
        color: color,
        isDeleted: false,
        isSynced: false,
      });
    });
    
    return noteId;
  }

  /**
   * Update an existing note
   */
  updateNote(noteId, updates) {
    const note = this.getNoteById(noteId);
    
    if (!note) {
      console.error(`Note with ID ${noteId} not found`);
      return false;
    }
    
    this.realm.write(() => {
      // Update provided fields
      if (updates.title !== undefined) note.title = updates.title;
      if (updates.content !== undefined) note.content = updates.content;
      if (updates.category !== undefined) note.category = updates.category;
      if (updates.color !== undefined) note.color = updates.color;
      
      // Always update these fields
      note.updatedAt = new Date();
      note.isSynced = false; // Mark for sync
    });
    
    return true;
  }

  /**
   * Delete a note (soft delete)
   */
  deleteNote(noteId) {
    const note = this.getNoteById(noteId);
    
    if (!note) {
      console.error(`Note with ID ${noteId} not found`);
      return false;
    }
    
    this.realm.write(() => {
      note.isDeleted = true; // Soft delete
      note.updatedAt = new Date();
      note.isSynced = false; // Mark for sync
    });
    
    return true;
  }

  /**
   * Hard delete a note (permanent removal)
   */
  hardDeleteNote(noteId) {
    const note = this.getNoteById(noteId);
    
    if (!note) {
      console.error(`Note with ID ${noteId} not found`);
      return false;
    }
    
    // Store note data before deleting it
    const noteData = {
      id: noteId,
      title: note.title,
      content: note.content,
      category: note.category,
      color: note.color
    };
    
    // Add to set of hard-deleted IDs to prevent reappearing
    this.hardDeletedIds.add(noteId);
    
    // First prep it for sync by marking it for hard delete
    // but without actually deleting it from Realm yet
    this.realm.write(() => {
      note.isDeleted = true;
      note.hardDeleted = true;
      note.updatedAt = new Date();
      note.isSynced = false; // Mark for sync
      // Clear content to save space while waiting for sync
      note.content = '';
    });
    
    // Store hard deleted IDs in AsyncStorage for persistence
    this._persistHardDeletedIds();
    
    return true;
  }

  /**
   * Save hard-deleted IDs to AsyncStorage
   */
  async _persistHardDeletedIds() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const idsArray = Array.from(this.hardDeletedIds);
      await AsyncStorage.setItem(`hardDeletedNotes_${this.userId}`, JSON.stringify(idsArray));
    } catch (error) {
      console.error('Failed to persist hard-deleted IDs:', error);
    }
  }

  /**
   * Load hard-deleted IDs from AsyncStorage
   */
  async loadHardDeletedIds() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const storedIds = await AsyncStorage.getItem(`hardDeletedNotes_${this.userId}`);
      if (storedIds) {
        const idsArray = JSON.parse(storedIds);
        this.hardDeletedIds = new Set(idsArray);
      }
    } catch (error) {
      console.error('Failed to load hard-deleted IDs:', error);
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
  getNotesByCategory(category) {
    return this.realm.objects('Note')
      .filtered('userId == $0 && category == $1 && isDeleted == false', this.userId, category)
      .sorted('updatedAt', true);
  }

  /**
   * Search notes by title or content
   */
  searchNotes(query) {
    const searchQuery = query.toLowerCase();
    return this.realm.objects('Note')
      .filtered('userId == $0 && isDeleted == false', this.userId)
      .filtered('title CONTAINS[c] $0 || content CONTAINS[c] $0', searchQuery)
      .sorted('updatedAt', true);
  }

  /**
   * Mark a note as synced
   */
  markAsSynced(noteId) {
    const note = this.getNoteById(noteId);
    
    if (!note) {
      console.error(`Note with ID ${noteId} not found`);
      return false;
    }
    
    this.realm.write(() => {
      // If this is a hard-deleted note and it's now synced, we can safely remove it
      if (note.hardDeleted) {
        this.realm.delete(note);
      } else {
        note.isSynced = true;
      }
    });
    
    return true;
  }

  /**
   * Get all unsynced notes
   */
  getUnsyncedNotes() {
    return this.realm.objects('Note')
      .filtered('userId == $0 && isSynced == false', this.userId)
      .sorted('updatedAt', true);
  }

  /**
   * Get deleted notes that haven't been synced
   */
  getDeletedUnsyncedNotes() {
    return this.realm.objects('Note')
      .filtered('userId == $0 && isDeleted == true && isSynced == false', this.userId)
      .sorted('updatedAt', true);
  }

  purgeHardDeletedNotes() {
    const hardDeletedNotes = this.realm.objects('Note')
      .filtered('userId == $0 && hardDeleted == true && isSynced == true', this.userId);
      
    if (hardDeletedNotes.length > 0) {
      this.realm.write(() => {
        this.realm.delete(hardDeletedNotes);
      });
      console.log(`Purged ${hardDeletedNotes.length} synced hard-deleted notes`);
    }
  }
  
}