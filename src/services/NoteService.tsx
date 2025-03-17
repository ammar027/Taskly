import { v4 as uuidv4 } from 'uuid';

export default class NoteService {
  constructor(realm, userId) {
    this.realm = realm;
    this.userId = userId;
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
    const noteId = uuidv4();
    
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
    
    this.realm.write(() => {
      this.realm.delete(note);
    });
    
    return true;
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
      note.isSynced = true;
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
}