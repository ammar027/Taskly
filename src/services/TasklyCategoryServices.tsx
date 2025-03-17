import 'react-native-get-random-values'; 
import { v4 as uuid } from 'uuid';

export default class CategoryService {
  constructor(realm, userId) {
    this.realm = realm;
    this.userId = userId;
  }

  getAllCategories() {
    return this.realm.objects('Category')
      .filtered('userId == $0 && isDeleted == false', this.userId)
      .sorted('name');
  }

  getCategoryById(id) {
    return this.realm.objectForPrimaryKey('Category', id);
  }

  createCategory(name, color) {
    const id = uuid();
    const now = new Date();
    
    this.realm.write(() => {
      this.realm.create('Category', {
        id,
        name,
        color,
        createdAt: now,
        updatedAt: now,
        userId: this.userId,
        isDeleted: false,
        isSynced: false,
      });
    });
    
    return id;
  }

  updateCategory(id, name, color) {
    if (!id || typeof id !== 'string') {
      throw new Error('Expected value to be a string, got ' + typeof id);
    }
    
    const category = this.getCategoryById(id);
    
    if (!category) return false;
    
    this.realm.write(() => {
      category.name = name;
      category.color = color;
      category.updatedAt = new Date();
      category.isSynced = false;
    });
    
    return true;
  }

  deleteCategory(id) {
    const category = this.getCategoryById(id);
    
    if (!category) return false;
    
    this.realm.write(() => {
      category.isDeleted = true;
      category.updatedAt = new Date();
      category.isSynced = false;
      
      // Update all tasks with this category
      const tasksWithCategory = this.realm.objects('Task')
        .filtered('categoryId == $0 && isDeleted == false', id);
      
      tasksWithCategory.forEach(task => {
        task.categoryId = null;
        task.updatedAt = new Date();
        task.isSynced = false;
      });
    });
    
    return true;
  }
  
  permanentlyDeleteCategory(id) {
    const category = this.getCategoryById(id);
    
    if (!category) return false;
    
    this.realm.write(() => {
      // First, update all associated tasks
      const tasksWithCategory = this.realm.objects('Task')
        .filtered('categoryId == $0', id);
      
      tasksWithCategory.forEach(task => {
        task.categoryId = null;
        task.updatedAt = new Date();
        task.isSynced = false;
      });
      
      // Then delete the category
      this.realm.delete(category);
    });
    
    return true;
  }
  
  getTaskCountByCategory() {
    const categories = this.getAllCategories();
    const result = [];
    
    categories.forEach(category => {
      const count = this.realm.objects('Task')
        .filtered('categoryId == $0 && isDeleted == false', category.id)
        .length;
      
      result.push({
        id: category.id,
        name: category.name,
        color: category.color,
        count
      });
    });
    
    return result;
  }
}