export const TaskSchema = {
    name: 'Task',
    primaryKey: 'id',
    properties: {
      id: 'string',
      title: 'string',
      description: 'string?',
      dueDate: 'date?',
      priority: 'int', // 0: Low, 1: Medium, 2: High
      status: 'string', // 'todo', 'in_progress', 'completed'
      createdAt: 'date',
      updatedAt: 'date',
      userId: 'string',
      isDeleted: { type: 'bool', default: false },
      isSynced: { type: 'bool', default: false },
      categoryId: 'string?',
      completedAt: 'date?',
    },
  };