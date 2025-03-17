export const CategorySchema = {
    name: 'Category',
    primaryKey: 'id',
    properties: {
      id: 'string',
      name: 'string',
      color: 'string',
      createdAt: 'date',
      updatedAt: 'date',
      userId: 'string',
      isDeleted: { type: 'bool', default: false },
      isSynced: { type: 'bool', default: false },
    },
  };