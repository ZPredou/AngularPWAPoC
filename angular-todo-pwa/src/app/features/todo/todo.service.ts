import { Injectable, signal, computed } from '@angular/core';
import { Todo } from '../../shared';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private todos = signal<Todo[]>([]);

  // Computed properties
  allTodos = computed(() => this.todos());
  completedTodos = computed(() => this.todos().filter(todo => todo.completed));
  pendingTodos = computed(() => this.todos().filter(todo => !todo.completed));
  
  // Statistics
  totalCount = computed(() => this.todos().length);
  completedCount = computed(() => this.completedTodos().length);
  pendingCount = computed(() => this.pendingTodos().length);

  // Actions
  addTodo(text: string): void {
    if (text.trim()) {
      const newTodo: Todo = {
        id: Date.now(),
        text: text.trim(),
        completed: false,
        createdAt: new Date()
      };
      this.todos.update(todos => [...todos, newTodo]);
    }
  }

  toggleTodo(id: number): void {
    this.todos.update(todos =>
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  deleteTodo(id: number): void {
    this.todos.update(todos => todos.filter(todo => todo.id !== id));
  }

  clearCompleted(): void {
    this.todos.update(todos => todos.filter(todo => !todo.completed));
  }

  loadSampleTodos(): void {
    const sampleTodos: Todo[] = [
      {
        id: 1,
        text: 'Learn Angular Signals',
        completed: true,
        createdAt: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        id: 2,
        text: 'Implement device detection',
        completed: true,
        createdAt: new Date(Date.now() - 43200000) // 12 hours ago
      },
      {
        id: 3,
        text: 'Create responsive design',
        completed: false,
        createdAt: new Date(Date.now() - 3600000) // 1 hour ago
      },
      {
        id: 4,
        text: 'Test on different devices',
        completed: false,
        createdAt: new Date()
      }
    ];
    this.todos.set(sampleTodos);
  }
}
