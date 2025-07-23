import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaUpdateService } from '../../../core/services/pwa-update.service';
import { PwaInstallService } from '../../../core/services/pwa-install.service';
import { TodoService } from '../../../features/todo/todo.service';

@Component({
  selector: 'app-pwa-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pwa-status" [class.expanded]="isExpanded()">
      <div class="status-header" (click)="toggleExpanded()">
        <div class="status-indicator">
          <div class="status-dot" [class]="getStatusClass()"></div>
          <span class="status-text">{{ getStatusText() }}</span>
        </div>
        <button class="expand-button" [class.rotated]="isExpanded()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="status-details" *ngIf="isExpanded()">
        <!-- Connection Status -->
        <div class="status-item">
          <div class="status-item-header">
            <span class="status-icon">🌐</span>
            <span class="status-label">Connection</span>
          </div>
          <span class="status-value" [class.online]="todoService.isOnline()" [class.offline]="!todoService.isOnline()">
            {{ todoService.isOnline() ? 'Online' : 'Offline' }}
          </span>
        </div>

        <!-- Installation Status -->
        <div class="status-item">
          <div class="status-item-header">
            <span class="status-icon">📱</span>
            <span class="status-label">Installation</span>
          </div>
          <span class="status-value">
            {{ getInstallationStatus() }}
          </span>
        </div>

        <!-- Service Worker Status -->
        <div class="status-item">
          <div class="status-item-header">
            <span class="status-icon">⚙️</span>
            <span class="status-label">Service Worker</span>
          </div>
          <span class="status-value">
            {{ getServiceWorkerStatus() }}
          </span>
        </div>

        <!-- Data Sync Status -->
        <div class="status-item">
          <div class="status-item-header">
            <span class="status-icon">🔄</span>
            <span class="status-label">Last Sync</span>
          </div>
          <span class="status-value">
            {{ getLastSyncText() }}
          </span>
        </div>

        <!-- Update Status -->
        <div class="status-item" *ngIf="updateService.updateAvailable()">
          <div class="status-item-header">
            <span class="status-icon">🆕</span>
            <span class="status-label">Update Available</span>
          </div>
          <button class="update-button" (click)="applyUpdate()" [disabled]="updateService.isUpdating()">
            {{ updateService.isUpdating() ? 'Updating...' : 'Update Now' }}
          </button>
        </div>

        <!-- PWA Features -->
        <div class="status-section">
          <h4>PWA Features</h4>
          <div class="feature-list">
            <div class="feature-item" [class.enabled]="true">
              <span class="feature-icon">✅</span>
              <span>Offline Storage</span>
            </div>
            <div class="feature-item" [class.enabled]="installService.isStandalone()">
              <span class="feature-icon">{{ installService.isStandalone() ? '✅' : '❌' }}</span>
              <span>Standalone Mode</span>
            </div>
            <div class="feature-item" [class.enabled]="hasNotificationSupport()">
              <span class="feature-icon">{{ hasNotificationSupport() ? '✅' : '❌' }}</span>
              <span>Push Notifications</span>
            </div>
            <div class="feature-item" [class.enabled]="hasServiceWorkerSupport()">
              <span class="feature-icon">{{ hasServiceWorkerSupport() ? '✅' : '❌' }}</span>
              <span>Background Sync</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="status-actions">
          <button class="action-button" (click)="refreshData()" [disabled]="todoService.isLoading()">
            {{ todoService.isLoading() ? 'Refreshing...' : 'Refresh Data' }}
          </button>
          <button class="action-button" (click)="requestNotificationPermission()" *ngIf="!hasNotificationPermission()">
            Enable Notifications
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pwa-status {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .status-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transition: background-color 0.2s;
    }

    .status-dot.online {
      background-color: #10b981;
    }

    .status-dot.offline {
      background-color: #ef4444;
    }

    .status-dot.updating {
      background-color: #f59e0b;
      animation: pulse 2s infinite;
    }

    .status-text {
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .expand-button {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    }

    .expand-button:hover {
      background-color: #e5e7eb;
    }

    .expand-button.rotated {
      transform: rotate(180deg);
    }

    .status-details {
      padding: 16px;
    }

    .status-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .status-item:last-child {
      border-bottom: none;
    }

    .status-item-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-icon {
      font-size: 16px;
    }

    .status-label {
      font-size: 14px;
      color: #374151;
    }

    .status-value {
      font-size: 13px;
      color: #6b7280;
      font-weight: 500;
    }

    .status-value.online {
      color: #10b981;
    }

    .status-value.offline {
      color: #ef4444;
    }

    .update-button {
      background-color: #2563eb;
      color: white;
      border: none;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .update-button:hover:not(:disabled) {
      background-color: #1d4ed8;
    }

    .update-button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }

    .status-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f3f4f6;
    }

    .status-section h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }

    .feature-list {
      display: grid;
      gap: 8px;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #6b7280;
    }

    .feature-item.enabled {
      color: #374151;
    }

    .feature-icon {
      font-size: 14px;
    }

    .status-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f3f4f6;
    }

    .action-button {
      flex: 1;
      background-color: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-button:hover:not(:disabled) {
      background-color: #e5e7eb;
    }

    .action-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class PwaStatusComponent {
  updateService = inject(PwaUpdateService);
  installService = inject(PwaInstallService);
  todoService = inject(TodoService);

  protected isExpanded = signal(false);

  toggleExpanded(): void {
    this.isExpanded.update(expanded => !expanded);
  }

  getStatusClass(): string {
    if (this.updateService.isUpdating()) return 'updating';
    return this.todoService.isOnline() ? 'online' : 'offline';
  }

  getStatusText(): string {
    if (this.updateService.isUpdating()) return 'Updating...';
    if (this.updateService.updateAvailable()) return 'Update Available';
    return this.todoService.isOnline() ? 'PWA Active' : 'Offline Mode';
  }

  getInstallationStatus(): string {
    if (this.installService.isStandalone()) return 'Installed';
    if (this.installService.canInstall()) return 'Can Install';
    return 'Browser Only';
  }

  getServiceWorkerStatus(): string {
    if ('serviceWorker' in navigator) {
      return 'Supported';
    }
    return 'Not Supported';
  }

  getLastSyncText(): string {
    const lastSync = this.todoService.serviceStatus().lastSync;
    if (!lastSync) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  hasNotificationSupport(): boolean {
    return 'Notification' in window;
  }

  hasServiceWorkerSupport(): boolean {
    return 'serviceWorker' in navigator;
  }

  hasNotificationPermission(): boolean {
    return this.hasNotificationSupport() && Notification.permission === 'granted';
  }

  async applyUpdate(): Promise<void> {
    await this.updateService.applyUpdate();
  }

  async refreshData(): Promise<void> {
    await this.todoService.refreshFromStorage();
  }

  async requestNotificationPermission(): Promise<void> {
    await this.updateService.requestNotificationPermission();
  }
}
