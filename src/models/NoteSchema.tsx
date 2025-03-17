export const NoteSchema = {
    name: 'Note',
    primaryKey: 'id',
    properties: {
      id: 'string',
      title: 'string',
      content: 'string',
      createdAt: 'date',
      updatedAt: 'date',
      userId: 'string',
      category: { type: 'string', default: 'Notes' },
      color: { type: 'string', default: '#4F46E5' },
      isDeleted: { type: 'bool', default: false },
      isSynced: { type: 'bool', default: false },
    },
  };