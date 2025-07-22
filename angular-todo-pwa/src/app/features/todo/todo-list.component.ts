import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceDetectionService } from '../../core';
import { TodoService } from './todo.service';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css'
})
export class TodoListComponent implements OnInit {
  newTodoText = signal('');

  constructor(
    public deviceService: DeviceDetectionService,
    public todoService: TodoService
  ) {}

  ngOnInit(): void {
    // Load sample todos for demonstration
    if (this.todoService.totalCount() === 0) {
      this.todoService.loadSampleTodos();
    }
  }

  addTodo(): void {
    const text = this.newTodoText().trim();
    if (text) {
      this.todoService.addTodo(text);
      this.newTodoText.set('');
    }
  }

  toggleTodo(id: number): void {
    this.todoService.toggleTodo(id);
  }

  deleteTodo(id: number): void {
    this.todoService.deleteTodo(id);
  }

  clearCompleted(): void {
    this.todoService.clearCompleted();
  }
}
