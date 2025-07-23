import { Injectable } from '@angular/core';
import { Todo } from '../../shared';

export interface StorageService {
  getTodos(): Promise<Todo[]>;
  saveTodos(todos: Todo[]): Promise<void>;
  addTodo(todo: Todo): Promise<void>;
  updateTodo(todo: Todo): Promise<void>;
  deleteTodo(id: number): Promise<void>;
  clearCompleted(): Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDBStorageService implements StorageService {
  private dbName = 'TodoPWADB';
  private dbVersion = 1;
  private storeName = 'todos';
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('completed', 'completed', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('Object store created');
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB');
    }
    return this.db;
  }

  async getTodos(): Promise<Todo[]> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          const todos = request.result.map(todo => ({
            ...todo,
            createdAt: new Date(todo.createdAt)
          }));
          resolve(todos);
        };

        request.onerror = () => {
          console.error('Error getting todos:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error in getTodos:', error);
      return [];
    }
  }

  async saveTodos(todos: Todo[]): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);

        // Clear existing todos
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          // Add all todos
          let completed = 0;
          const total = todos.length;

          if (total === 0) {
            resolve();
            return;
          }

          todos.forEach(todo => {
            const addRequest = store.add(todo);
            addRequest.onsuccess = () => {
              completed++;
              if (completed === total) {
                resolve();
              }
            };
            addRequest.onerror = () => {
              reject(addRequest.error);
            };
          });
        };

        clearRequest.onerror = () => {
          reject(clearRequest.error);
        };
      });
    } catch (error) {
      console.error('Error saving todos:', error);
      throw error;
    }
  }

  async addTodo(todo: Todo): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.add(todo);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('Error adding todo:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error in addTodo:', error);
      throw error;
    }
  }

  async updateTodo(todo: Todo): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(todo);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('Error updating todo:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error in updateTodo:', error);
      throw error;
    }
  }

  async deleteTodo(id: number): Promise<void> {
    try {
      const db = await this.ensureDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
          console.error('Error deleting todo:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('Error in deleteTodo:', error);
      throw error;
    }
  }

  async clearCompleted(): Promise<void> {
    try {
      const todos = await this.getTodos();
      const activeTodos = todos.filter(todo => !todo.completed);
      await this.saveTodos(activeTodos);
    } catch (error) {
      console.error('Error clearing completed todos:', error);
      throw error;
    }
  }
}
