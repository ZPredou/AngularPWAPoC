import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeviceDetectionService, PwaInstallService } from '../../core';
import { TodoService } from './todo.service';
import { PwaStatusComponent, PushNotificationsComponent } from '../../shared';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PwaStatusComponent, PushNotificationsComponent],
  templateUrl: './todo-list.component.html',
  styleUrl: './todo-list.component.css'
})
export class TodoListComponent implements OnInit {
  newTodoText = signal('');
  isProcessing = signal(false);
  isInstallingPWA = signal(false);

  pwaInstallService = inject(PwaInstallService);

  constructor(
    public deviceService: DeviceDetectionService,
    public todoService: TodoService
  ) {}

  ngOnInit(): void {
    // Load sample todos for demonstration if none exist
    setTimeout(async () => {
      if (this.todoService.totalCount() === 0) {
        try {
          await this.todoService.loadSampleTodos();
        } catch (error) {
          console.error('Error loading sample todos:', error);
        }
      }
    }, 1000); // Wait for storage to initialize
  }

  async addTodo(): Promise<void> {
    const text = this.newTodoText().trim();
    if (text && !this.isProcessing()) {
      this.isProcessing.set(true);
      try {
        await this.todoService.addTodo(text);
        this.newTodoText.set('');
      } catch (error) {
        console.error('Error adding todo:', error);
        // Could show a toast notification here
      } finally {
        this.isProcessing.set(false);
      }
    }
  }

  async toggleTodo(id: number): Promise<void> {
    if (this.isProcessing()) return;

    this.isProcessing.set(true);
    try {
      await this.todoService.toggleTodo(id);
    } catch (error) {
      console.error('Error toggling todo:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async deleteTodo(id: number): Promise<void> {
    if (this.isProcessing()) return;

    this.isProcessing.set(true);
    try {
      await this.todoService.deleteTodo(id);
    } catch (error) {
      console.error('Error deleting todo:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async clearCompleted(): Promise<void> {
    if (this.isProcessing()) return;

    this.isProcessing.set(true);
    try {
      await this.todoService.clearCompleted();
    } catch (error) {
      console.error('Error clearing completed todos:', error);
    } finally {
      this.isProcessing.set(false);
    }
  }

  // PWA Install Methods
  shouldShowInstallButton(): boolean {
    return this.pwaInstallService.shouldShowInstallPrompt();
  }

  async installPWA(): Promise<void> {
    if (this.isInstallingPWA()) return;

    this.isInstallingPWA.set(true);
    try {
      const installed = await this.pwaInstallService.showInstallPrompt();
      if (!installed) {
        // If the native prompt failed or was dismissed, show instructions
        console.log('Install prompt was dismissed or failed');
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    } finally {
      this.isInstallingPWA.set(false);
    }
  }

  getInstallHint(): string {
    const platform = this.pwaInstallService.status().platform;

    switch (platform) {
      case 'iOS':
        return 'Tap Share → Add to Home Screen';
      case 'Android':
        return 'Tap menu → Install App';
      default:
        return 'Click to install as an app';
    }
  }
}
