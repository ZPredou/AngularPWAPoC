import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PushNotificationService } from '../../../core/services/push-notification.service';

@Component({
  selector: 'app-push-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="push-notifications-container">
      <div class="notification-header">
        <div class="status-indicator">
          <div class="status-dot" [class]="getStatusClass()"></div>
          <h3>🔔 Push Notifications</h3>
        </div>
        <div class="status-text">{{ pushService.getStatusText() }}</div>
      </div>

      <!-- Permission Request Section -->
      @if (pushService.canRequestPermission()) {
        <div class="permission-section">
          <p class="info-text">
            Enable push notifications to receive updates even when the app is closed.
          </p>
          <button 
            class="btn btn-primary"
            (click)="requestPermission()"
            [disabled]="isLoading()"
          >
            {{ isLoading() ? 'Requesting...' : '🔔 Enable Notifications' }}
          </button>
        </div>
      }

      <!-- Blocked Permission Section -->
      @if (pushService.isBlocked()) {
        <div class="blocked-section">
          <div class="warning-message">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>Notifications Blocked</strong>
              <p>Please enable notifications in your browser settings to receive updates.</p>
            </div>
          </div>
          <button class="btn btn-secondary" (click)="showBrowserInstructions()">
            📖 Show Instructions
          </button>
        </div>
      }

      <!-- Subscription Section -->
      @if (pushService.hasPermission()) {
        <div class="subscription-section">
          @if (!pushService.isEnabled()) {
            <div class="subscription-controls">
              <p class="info-text">
                Subscribe to receive push notifications from the server.
              </p>
              <div class="vapid-input">
                <label for="vapidKey">Server Public Key (VAPID):</label>
                <input 
                  id="vapidKey"
                  type="text" 
                  [(ngModel)]="vapidKey"
                  placeholder="Enter VAPID public key..."
                  class="form-input"
                >
              </div>
              <button 
                class="btn btn-primary"
                (click)="subscribe()"
                [disabled]="isLoading() || !vapidKey()"
              >
                {{ isLoading() ? 'Subscribing...' : '📡 Subscribe' }}
              </button>
            </div>
          } @else {
            <div class="subscribed-section">
              <div class="success-message">
                <span class="success-icon">✅</span>
                <div>
                  <strong>Successfully Subscribed</strong>
                  <p>You will receive push notifications from the server.</p>
                </div>
              </div>
              <div class="test-info">
                <h5>🧪 Testing Notifications</h5>
                <p><strong>Important:</strong> Browsers suppress notifications when the page is active. For best results:</p>
                <ul>
                  <li>Click "Test Notification" then switch to another tab/app</li>
                  <li>Or use "Delayed Test" and switch tabs during the countdown</li>
                  <li>Real notifications from the server will always show</li>
                </ul>
              </div>

              <div class="subscription-actions">
                <button
                  class="btn btn-secondary"
                  (click)="showTestNotification()"
                  [disabled]="isLoading()"
                >
                  🧪 Test Notification
                </button>

                <button
                  class="btn btn-secondary"
                  (click)="showDelayedTestNotification()"
                  [disabled]="isLoading()"
                >
                  ⏰ Delayed Test (5s)
                </button>
                <button
                  class="btn btn-danger"
                  (click)="unsubscribe()"
                  [disabled]="isLoading()"
                >
                  {{ isLoading() ? 'Unsubscribing...' : '🚫 Unsubscribe' }}
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Error Display -->
      @if (pushService.lastError()) {
        <div class="error-section">
          <div class="error-message">
            <span class="error-icon">❌</span>
            <div>
              <strong>Error</strong>
              <p>{{ pushService.lastError() }}</p>
            </div>
          </div>
          <button class="btn btn-secondary" (click)="clearError()">
            Clear Error
          </button>
        </div>
      }

      <!-- Message Display -->
      @if (pushService.lastMessage()) {
        <div class="message-section">
          <h4>📨 Last Received Message</h4>
          <div class="message-content">
            <pre>{{ pushService.lastMessage() | json }}</pre>
          </div>
        </div>
      }

      <!-- Notification Events -->
      @if (pushService.notificationClicks()) {
        <div class="events-section">
          <h4>🖱️ Last Notification Click</h4>
          <div class="event-content">
            <pre>{{ pushService.notificationClicks() | json }}</pre>
          </div>
        </div>
      }

      <!-- Subscription Info -->
      @if (pushService.subscription()) {
        <div class="subscription-info">
          <h4>📋 Subscription Details</h4>
          <div class="subscription-details">
            <div class="detail-item">
              <strong>Endpoint:</strong>
              <span class="endpoint">{{ getSubscriptionEndpoint() }}</span>
            </div>
            <div class="detail-item">
              <strong>Keys:</strong>
              <span class="keys-info">p256dh and auth keys present</span>
            </div>
          </div>
        </div>
      }

      <!-- Browser Instructions Modal -->
      @if (showInstructions()) {
        <div class="modal-overlay" (click)="hideInstructions()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Enable Notifications</h3>
              <button class="close-btn" (click)="hideInstructions()">×</button>
            </div>
            <div class="modal-body">
              <div class="instructions">
                <h4>Chrome/Edge:</h4>
                <ol>
                  <li>Click the lock icon in the address bar</li>
                  <li>Set "Notifications" to "Allow"</li>
                  <li>Refresh the page</li>
                </ol>
                
                <h4>Firefox:</h4>
                <ol>
                  <li>Click the shield icon in the address bar</li>
                  <li>Click "Enable notifications"</li>
                  <li>Refresh the page</li>
                </ol>
                
                <h4>Safari:</h4>
                <ol>
                  <li>Go to Safari > Preferences > Websites</li>
                  <li>Select "Notifications" from the left sidebar</li>
                  <li>Set this website to "Allow"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .push-notifications-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .notification-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 12px;
      border: 1px solid #e9ecef;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      transition: background-color 0.3s ease;
    }

    .status-dot.granted { background-color: #28a745; }
    .status-dot.denied { background-color: #dc3545; }
    .status-dot.default { background-color: #ffc107; }
    .status-dot.unsupported { background-color: #6c757d; }

    .status-text {
      font-weight: 600;
      color: #495057;
    }

    .notification-header h3 {
      margin: 0;
      color: #343a40;
      font-size: 1.25rem;
    }

    .permission-section,
    .blocked-section,
    .subscription-section,
    .error-section,
    .message-section,
    .events-section,
    .subscription-info {
      margin-bottom: 24px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e9ecef;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .info-text {
      color: #6c757d;
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 14px;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0056b3;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #545b62;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #c82333;
    }

    .warning-message,
    .success-message,
    .error-message {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    .warning-icon,
    .success-icon,
    .error-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .warning-message strong { color: #856404; }
    .success-message strong { color: #155724; }
    .error-message strong { color: #721c24; }

    .warning-message p,
    .success-message p,
    .error-message p {
      margin: 4px 0 0 0;
      color: #6c757d;
    }

    .vapid-input {
      margin-bottom: 16px;
    }

    .vapid-input label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #495057;
    }

    .form-input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }

    .test-info {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .test-info h5 {
      margin: 0 0 8px 0;
      color: #856404;
      font-size: 14px;
    }

    .test-info p {
      margin: 0 0 8px 0;
      color: #856404;
      font-size: 13px;
    }

    .test-info ul {
      margin: 0;
      padding-left: 20px;
      color: #856404;
      font-size: 13px;
    }

    .test-info li {
      margin-bottom: 4px;
    }

    .subscription-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .message-content,
    .event-content {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 6px;
      border: 1px solid #e9ecef;
      overflow-x: auto;
    }

    .message-content pre,
    .event-content pre {
      margin: 0;
      font-size: 12px;
      color: #495057;
    }

    .subscription-details {
      space-y: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 12px;
    }

    .detail-item strong {
      color: #495057;
      font-size: 14px;
    }

    .endpoint {
      font-family: monospace;
      font-size: 12px;
      color: #6c757d;
      word-break: break-all;
    }

    .keys-info {
      font-size: 12px;
      color: #28a745;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
    }

    .modal-header h3 {
      margin: 0;
      color: #343a40;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6c757d;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      color: #343a40;
    }

    .modal-body {
      padding: 20px;
    }

    .instructions h4 {
      color: #495057;
      margin: 16px 0 8px 0;
    }

    .instructions h4:first-child {
      margin-top: 0;
    }

    .instructions ol {
      margin: 0 0 16px 0;
      padding-left: 20px;
    }

    .instructions li {
      margin-bottom: 4px;
      color: #6c757d;
    }

    @media (max-width: 768px) {
      .push-notifications-container {
        padding: 16px;
      }
      
      .notification-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
      
      .subscription-actions {
        flex-direction: column;
      }
      
      .btn {
        width: 100%;
      }
    }
  `]
})
export class PushNotificationsComponent {
  readonly pushService = inject(PushNotificationService);

  // Component state
  readonly isLoading = signal(false);
  readonly showInstructions = signal(false);
  readonly vapidKey = signal('');

  getStatusClass(): string {
    if (!this.pushService.isSupported()) return 'unsupported';
    return this.pushService.permission();
  }

  async requestPermission(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.pushService.requestPermission();
    } catch (error) {
      // Error is handled by the service
    } finally {
      this.isLoading.set(false);
    }
  }

  async subscribe(): Promise<void> {
    if (!this.vapidKey()) return;
    
    this.isLoading.set(true);
    try {
      await this.pushService.subscribe(this.vapidKey());
    } catch (error) {
      // Error is handled by the service
    } finally {
      this.isLoading.set(false);
    }
  }

  async unsubscribe(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.pushService.unsubscribe();
    } catch (error) {
      // Error is handled by the service
    } finally {
      this.isLoading.set(false);
    }
  }

  async showTestNotification(): Promise<void> {
    try {
      await this.pushService.showTestNotification({
        title: '🧪 Test Notification',
        body: 'This is a test notification from your PWA!',
        tag: 'test-notification'
      });
    } catch (error) {
      // Error is handled by the service
    }
  }

  async showDelayedTestNotification(): Promise<void> {
    // Show countdown message
    for (let i = 5; i > 0; i--) {
      this.pushService.showFallbackNotification(
        `⏰ Delayed Test Starting in ${i}...`,
        'Switch to another tab/app now to see the notification when it appears!'
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Now show the test notification
    try {
      await this.pushService.showTestNotification({
        title: '⏰ Delayed Test Notification',
        body: 'This notification was sent after a 5-second delay. You should see it even if you switched tabs!',
        tag: 'delayed-test'
      });
    } catch (error) {
      // Error is handled by the service
    }
  }

  showBrowserInstructions(): void {
    this.showInstructions.set(true);
  }

  hideInstructions(): void {
    this.showInstructions.set(false);
  }

  clearError(): void {
    this.pushService.clearError();
  }

  getSubscriptionEndpoint(): string {
    const subscription = this.pushService.subscription();
    if (!subscription) return '';
    
    const endpoint = subscription.endpoint;
    return endpoint.length > 50 ? endpoint.substring(0, 50) + '...' : endpoint;
  }
}
