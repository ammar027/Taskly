// Mock implementation of Realm for web
class MockRealm {
  constructor() {
    this.storage = {};
  }

  objects(schemaName) {
    if (!this.storage[schemaName]) {
      this.storage[schemaName] = [];
    }
    
    return {
      filtered: (query) => {
        console.log('Mock filtered query:', query);
        return this.storage[schemaName];
      },
      sorted: () => this.storage[schemaName]
    };
  }

  write(callback) {
    callback();
  }

  create(schemaName, object) {
    if (!this.storage[schemaName]) {
      this.storage[schemaName] = [];
    }
    const newObject = { ...object, _id: Date.now().toString() };
    this.storage[schemaName].push(newObject);
    return newObject;
  }

  delete(object) {
    // Implementation depends on how you identify objects
    console.log('Mock delete operation', object);
  }

  close() {
    console.log('Mock Realm closed');
  }
}

// Mock the Realm export to match what your app expects
export default {
  open: async () => {
    console.log('Mock Realm opened successfully');
    return new MockRealm();
  },
  Object: {
    create: (data) => data
  },
  // Add any other static methods you're using
};