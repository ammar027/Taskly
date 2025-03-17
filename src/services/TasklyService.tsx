import 'react-native-get-random-values'; 
import { v4 as uuid } from 'uuid';

export default class TaskService {
  constructor(realm, userId) {
    this.realm = realm;
    this.userId = userId;
  }

  getAllTasks(statusFilter = null, categoryFilter = null) {
    let query = 'userId == $0 && isDeleted == false';
    const queryParams = [this.userId];
    
    if (statusFilter) {
      query += ' && status == $1';
      queryParams.push(statusFilter);
    }
    
    if (categoryFilter) {
      query += ' && categoryId == $' + queryParams.length;
      queryParams.push(categoryFilter);
    }
    
    return this.realm.objects('Task')
      .filtered(query, ...queryParams)
      .sorted('dueDate');
  }
  
  getDeletedTasks() {
    return this.realm.objects('Task')
      .filtered('userId == $0 && isDeleted == true', this.userId)
      .sorted('updatedAt', true);
  }

  getTaskById(id) {
    return this.realm.objectForPrimaryKey('Task', id);
  }

  createTask(title, description = '', dueDate = null, priority = 1, status = 'todo', categoryId = null) {
    const id = uuid();
    const now = new Date();
    
    this.realm.write(() => {
      this.realm.create('Task', {
        id,
        title,
        description,
        dueDate,
        priority,
        status,
        createdAt: now,
        updatedAt: now,
        userId: this.userId,
        categoryId,
        completedAt: null,
        isDeleted: false,
        isSynced: false,
      });
    });
    
    return id;
  }

  updateTask(id, updates) {
    if (!id || typeof id !== 'string') {
      throw new Error('Expected value to be a string, got ' + typeof id);
    }
    
    const task = this.getTaskById(id);
    
    if (!task) return false;
    
    this.realm.write(() => {
      // Update all provided fields
      Object.keys(updates).forEach(key => {
        // Special handling for status changes to completed
        if (key === 'status' && updates[key] === 'completed' && task.status !== 'completed') {
          task.completedAt = new Date();
        } else if (key === 'status' && updates[key] !== 'completed') {
          task.completedAt = null;
        }
        
        task[key] = updates[key];
      });
      
      task.updatedAt = new Date();
      task.isSynced = false;
    });
    
    return true;
  }

  deleteTask(id) {
    const task = this.getTaskById(id);
    
    if (!task) return false;
    
    this.realm.write(() => {
      task.isDeleted = true;
      task.updatedAt = new Date();
      task.isSynced = false;
    });
    
    return true;
  }
  
  restoreTask(id) {
    const task = this.getTaskById(id);
    
    if (!task) return false;
    
    this.realm.write(() => {
      task.isDeleted = false;
      task.updatedAt = new Date();
      task.isSynced = false;
    });
    
    return true;
  }
  
  permanentlyDeleteTask(id) {
    const task = this.getTaskById(id);
    
    if (!task) return false;
    
    this.realm.write(() => {
      this.realm.delete(task);
    });
    
    return true;
  }
  
  emptyTrash() {
    const deletedTasks = this.getDeletedTasks();
    
    this.realm.write(() => {
      this.realm.delete(deletedTasks);
    });
    
    return true;
  }

  // Get task statistics
  getTaskStatistics() {
    const allTasks = this.realm.objects('Task')
      .filtered('userId == $0 && isDeleted == false', this.userId);
    
    const todoTasks = allTasks.filtered('status == "todo"');
    const inProgressTasks = allTasks.filtered('status == "in_progress"');
    const completedTasks = allTasks.filtered('status == "completed"');
    
    // Tasks due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueToday = allTasks.filtered('dueDate >= $0 && dueDate < $1', today, tomorrow);
    
    // Overdue tasks
    const overdueTasks = allTasks.filtered('dueDate < $0 && status != "completed"', today);
    
    return {
      total: allTasks.length,
      todo: todoTasks.length,
      inProgress: inProgressTasks.length,
      completed: completedTasks.length,
      dueToday: dueToday.length,
      overdue: overdueTasks.length
    };
  }
}