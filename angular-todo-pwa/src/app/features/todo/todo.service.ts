import { Injectable, signal, computed, inject } from '@angular/core';
import { Todo } from '../../shared';
import { IndexedDBStorageService } from '../../core/services/storage.service';
import { PushNotificationService } from '../../core/services/push-notification.service';

export interface TodoServiceStatus {
  isOnline: boolean;
  isLoading: boolean;
  lastSync: Date | null;
  pendingOperations: number;
}

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private storage = inject(IndexedDBStorageService);
  private notificationService = inject(PushNotificationService);
  private todos = signal<Todo[]>([]);
  private status = signal<TodoServiceStatus>({
    isOnline: navigator.onLine,
    isLoading: false,
    lastSync: null,
    pendingOperations: 0
  });

  // Computed properties
  allTodos = computed(() => this.todos());
  completedTodos = computed(() => this.todos().filter(todo => todo.completed));
  pendingTodos = computed(() => this.todos().filter(todo => !todo.completed));

  // Statistics
  totalCount = computed(() => this.todos().length);
  completedCount = computed(() => this.completedTodos().length);
  pendingCount = computed(() => this.pendingTodos().length);

  // Status
  serviceStatus = computed(() => this.status());
  isOnline = computed(() => this.status().isOnline);
  isLoading = computed(() => this.status().isLoading);

  constructor() {
    this.initializeService();
    this.setupOnlineStatusListener();
  }

  private async initializeService(): Promise<void> {
    this.setLoading(true);
    try {
      const storedTodos = await this.storage.getTodos();
      this.todos.set(storedTodos);
      this.updateStatus({ lastSync: new Date() });
    } catch (error) {
      console.error('Error loading todos from storage:', error);
    } finally {
      this.setLoading(false);
    }
  }

  private setupOnlineStatusListener(): void {
    window.addEventListener('online', async () => {
      this.updateStatus({ isOnline: true });
      if (this.notificationService.isEnabled()) {
        await this.notificationService.showOnlineNotification();
      }
    });

    window.addEventListener('offline', async () => {
      this.updateStatus({ isOnline: false });
      if (this.notificationService.isEnabled()) {
        await this.notificationService.showOfflineNotification();
      }
    });
  }

  private setLoading(loading: boolean): void {
    this.status.update(status => ({ ...status, isLoading: loading }));
  }

  private updateStatus(updates: Partial<TodoServiceStatus>): void {
    this.status.update(status => ({ ...status, ...updates }));
  }

  private async persistTodos(): Promise<void> {
    try {
      await this.storage.saveTodos(this.todos());
      this.updateStatus({ lastSync: new Date() });
    } catch (error) {
      console.error('Error persisting todos:', error);
    }
  }

  // Actions
  async addTodo(text: string): Promise<void> {
    if (text.trim()) {
      const newTodo: Todo = {
        id: Date.now(),
        text: text.trim(),
        completed: false,
        createdAt: new Date()
      };

      // Update local state immediately
      this.todos.update(todos => [...todos, newTodo]);

      // Persist to storage
      try {
        await this.storage.addTodo(newTodo);
        this.updateStatus({ lastSync: new Date() });
      } catch (error) {
        console.error('Error adding todo to storage:', error);
        // Revert local state on error
        this.todos.update(todos => todos.filter(todo => todo.id !== newTodo.id));
        throw error;
      }
    }
  }

  async toggleTodo(id: number): Promise<void> {
    const currentTodos = this.todos();
    const todoToUpdate = currentTodos.find(todo => todo.id === id);

    if (!todoToUpdate) return;

    const updatedTodo = { ...todoToUpdate, completed: !todoToUpdate.completed };

    // Update local state immediately
    this.todos.update(todos =>
      todos.map(todo =>
        todo.id === id ? updatedTodo : todo
      )
    );

    // Persist to storage
    try {
      await this.storage.updateTodo(updatedTodo);
      this.updateStatus({ lastSync: new Date() });

      // Show notification if todo was completed
      if (updatedTodo.completed && !todoToUpdate.completed) {
        await this.notificationService.showTodoNotification({
          id: updatedTodo.id.toString(),
          title: updatedTodo.text
        });
      }
    } catch (error) {
      console.error('Error updating todo in storage:', error);
      // Revert local state on error
      this.todos.update(todos =>
        todos.map(todo =>
          todo.id === id ? todoToUpdate : todo
        )
      );
      throw error;
    }
  }

  async deleteTodo(id: number): Promise<void> {
    const currentTodos = this.todos();
    const todoToDelete = currentTodos.find(todo => todo.id === id);

    if (!todoToDelete) return;

    // Update local state immediately
    this.todos.update(todos => todos.filter(todo => todo.id !== id));

    // Persist to storage
    try {
      await this.storage.deleteTodo(id);
      this.updateStatus({ lastSync: new Date() });
    } catch (error) {
      console.error('Error deleting todo from storage:', error);
      // Revert local state on error
      this.todos.update(todos => [...todos, todoToDelete]);
      throw error;
    }
  }

  async clearCompleted(): Promise<void> {
    const currentTodos = this.todos();
    const completedTodos = currentTodos.filter(todo => todo.completed);

    if (completedTodos.length === 0) return;

    // Update local state immediately
    this.todos.update(todos => todos.filter(todo => !todo.completed));

    // Persist to storage
    try {
      await this.storage.clearCompleted();
      this.updateStatus({ lastSync: new Date() });
    } catch (error) {
      console.error('Error clearing completed todos from storage:', error);
      // Revert local state on error
      this.todos.set(currentTodos);
      throw error;
    }
  }

  async loadSampleTodos(): Promise<void> {
    const sampleTodos: Todo[] = [
      {
        id: 1,
        text: 'Learn Angular Signals',
        completed: true,
        createdAt: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        id: 2,
        text: 'Implement PWA features',
        completed: true,
        createdAt: new Date(Date.now() - 43200000) // 12 hours ago
      },
      {
        id: 3,
        text: 'Test offline functionality',
        completed: false,
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        id: 4,
        text: 'Add push notifications',
        completed: false,
        createdAt: new Date()
      }
    ];

    this.todos.set(sampleTodos);
    await this.persistTodos();
  }

  async refreshFromStorage(): Promise<void> {
    this.setLoading(true);
    try {
      const storedTodos = await this.storage.getTodos();
      this.todos.set(storedTodos);
      this.updateStatus({ lastSync: new Date() });
    } catch (error) {
      console.error('Error refreshing todos from storage:', error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  async exportTodos(): Promise<string> {
    const todos = this.todos();
    return JSON.stringify(todos, null, 2);
  }

  async importTodos(todosJson: string): Promise<void> {
    try {
      const importedTodos: Todo[] = JSON.parse(todosJson);

      // Validate the imported data
      const validTodos = importedTodos.filter(todo =>
        todo.id && todo.text && typeof todo.completed === 'boolean' && todo.createdAt
      ).map(todo => ({
        ...todo,
        createdAt: new Date(todo.createdAt)
      }));

      this.todos.set(validTodos);
      await this.persistTodos();
    } catch (error) {
      console.error('Error importing todos:', error);
      throw new Error('Invalid todo data format');
    }
  }
}
