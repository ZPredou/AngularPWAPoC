import { Injectable, signal, computed, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { toSignal } from '@angular/core/rxjs-interop';

export interface PushNotificationState {
  isSupported: boolean;
  isEnabled: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  lastMessage: any;
  lastError: string | null;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushNotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
  dir?: 'auto' | 'ltr' | 'rtl';
  lang?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private readonly swPush = inject(SwPush);
  
  // State management
  private readonly state = signal<PushNotificationState>({
    isSupported: this.swPush.isEnabled,
    isEnabled: false,
    permission: this.getNotificationPermission(),
    subscription: null,
    lastMessage: null,
    lastError: null
  });

  // Public readonly signals
  readonly isSupported = computed(() => this.state().isSupported);
  readonly isEnabled = computed(() => this.state().isEnabled);
  readonly permission = computed(() => this.state().permission);
  readonly subscription = computed(() => this.state().subscription);
  readonly lastMessage = computed(() => this.state().lastMessage);
  readonly lastError = computed(() => this.state().lastError);

  // Observable signals from SwPush
  readonly messages = toSignal(this.swPush.messages);
  readonly notificationClicks = toSignal(this.swPush.notificationClicks);
  readonly notificationCloses = toSignal(this.swPush.notificationCloses);
  readonly subscriptionChanges = toSignal(this.swPush.pushSubscriptionChanges);

  // Status helpers
  readonly canRequestPermission = computed(() => 
    this.isSupported() && this.permission() === 'default'
  );
  readonly hasPermission = computed(() => this.permission() === 'granted');
  readonly isBlocked = computed(() => this.permission() === 'denied');

  constructor() {
    this.initializeService();
    this.setupMessageHandlers();
  }

  private initializeService(): void {
    try {
      if (!this.swPush.isEnabled) {
        this.updateState({
          lastError: this.getServiceWorkerErrorMessage(),
          isSupported: false
        });
        return;
      }

      // Subscribe to current subscription with error handling
      this.swPush.subscription.subscribe({
        next: (subscription) => {
          this.updateState({
            subscription,
            isEnabled: !!subscription && this.permission() === 'granted',
            lastError: null
          });
        },
        error: (error) => {
          this.updateState({
            lastError: `Failed to get subscription: ${this.getErrorMessage(error)}`
          });
        }
      });

      // Update permission status
      this.updateState({ permission: this.getNotificationPermission() });
    } catch (error) {
      this.updateState({
        lastError: `Service initialization failed: ${this.getErrorMessage(error)}`,
        isSupported: false
      });
    }
  }

  private setupMessageHandlers(): void {
    // Handle incoming messages
    this.swPush.messages.subscribe(message => {
      this.updateState({ lastMessage: message });
      this.handleIncomingMessage(message);
    });

    // Handle notification clicks
    this.swPush.notificationClicks.subscribe(event => {
      this.handleNotificationClick(event);
    });

    // Handle notification closes
    this.swPush.notificationCloses.subscribe(event => {
      this.handleNotificationClose(event);
    });

    // Handle subscription changes
    this.swPush.pushSubscriptionChanges.subscribe(change => {
      this.updateState({ 
        subscription: change.newSubscription,
        isEnabled: !!change.newSubscription && this.permission() === 'granted'
      });
    });
  }

  private getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  private getServiceWorkerErrorMessage(): string {
    if (!('serviceWorker' in navigator)) {
      return 'Service Workers are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.';
    }

    if (!('Notification' in window)) {
      return 'Push notifications are not supported in this browser.';
    }

    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      return 'Push notifications require HTTPS. Please access the app over a secure connection.';
    }

    return 'Service Worker is not enabled. Please check your browser settings.';
  }

  private getErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.name === 'NotAllowedError') {
      return 'Permission denied. Please enable notifications in your browser settings.';
    }

    if (error?.name === 'NotSupportedError') {
      return 'Push notifications are not supported in this browser.';
    }

    if (error?.name === 'InvalidStateError') {
      return 'Service Worker is in an invalid state. Please refresh the page.';
    }

    return 'An unknown error occurred. Please try again.';
  }

  private isNetworkError(error: any): boolean {
    return error?.name === 'NetworkError' ||
           error?.message?.includes('network') ||
           error?.message?.includes('fetch');
  }

  private handleNetworkError(operation: string): void {
    this.updateState({
      lastError: `${operation} failed due to network issues. Please check your internet connection and try again.`
    });
  }

  private updateState(updates: Partial<PushNotificationState>): void {
    this.state.update(current => ({ ...current, ...updates }));
  }

  private handleIncomingMessage(message: any): void {
    // Handle different message types
    if (message?.notification) {
      // Message contains notification data - it will be shown automatically by the service worker
      return;
    }

    // Handle data-only messages (no notification)
    if (message?.data) {
      this.showDataNotification(message.data);
    }
  }

  private handleNotificationClick(event: any): void {
    const { action, notification } = event;

    // Focus the window
    if (typeof window !== 'undefined') {
      window.focus();
    }

    // Emit custom event for application to handle
    this.emitNotificationEvent('click', { action, notification });

    // Handle different actions
    switch (action) {
      case 'view':
        this.handleViewAction(notification);
        break;
      case 'dismiss':
        // Do nothing, notification is already closed
        break;
      case 'todo-complete':
        this.handleTodoCompleteAction(notification);
        break;
      case 'todo-snooze':
        this.handleTodoSnoozeAction(notification);
        break;
      case 'settings':
        this.handleSettingsAction();
        break;
      default:
        this.handleDefaultClick(notification);
        break;
    }
  }

  private handleNotificationClose(event: any): void {
    const { action, notification } = event;

    // Emit custom event for application to handle
    this.emitNotificationEvent('close', { action, notification });

    // Handle close-specific logic if needed
    if (action === 'timeout') {
      // Notification was closed due to timeout
      this.handleTimeoutClose(notification);
    }
  }

  private handleViewAction(notification: any): void {
    // Navigate to specific view based on notification data
    if (notification.data?.url) {
      window.location.href = notification.data.url;
    } else if (notification.data?.route) {
      // For SPA routing - emit event for router to handle
      this.emitNotificationEvent('navigate', { route: notification.data.route });
    }
  }

  private handleTodoCompleteAction(notification: any): void {
    if (notification.data?.todoId) {
      // Emit event for todo completion
      this.emitNotificationEvent('todo-complete', {
        todoId: notification.data.todoId,
        notification
      });
    }
  }

  private handleTodoSnoozeAction(notification: any): void {
    if (notification.data?.todoId) {
      // Emit event for todo snoozing
      this.emitNotificationEvent('todo-snooze', {
        todoId: notification.data.todoId,
        snoozeMinutes: notification.data.snoozeMinutes || 15,
        notification
      });
    }
  }

  private handleSettingsAction(): void {
    // Navigate to settings or emit event
    this.emitNotificationEvent('navigate', { route: '/settings' });
  }

  private handleDefaultClick(notification: any): void {
    // Default click behavior - focus app and show relevant content
    if (notification.data?.type) {
      this.emitNotificationEvent('show-content', {
        type: notification.data.type,
        data: notification.data,
        notification
      });
    } else {
      // Just focus the app
      this.emitNotificationEvent('focus-app', { notification });
    }
  }

  private handleTimeoutClose(notification: any): void {
    // Handle notifications that were closed due to timeout
    if (notification.data?.requiresFollowUp) {
      // Schedule a follow-up notification or action
      this.emitNotificationEvent('timeout-followup', { notification });
    }
  }

  private emitNotificationEvent(type: string, data: any): void {
    // Emit custom events that the application can listen to
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(`push-notification-${type}`, {
        detail: data
      });
      window.dispatchEvent(event);
    }
  }

  private showDataNotification(data: any): void {
    if (!this.hasPermission()) return;

    const options: PushNotificationOptions = {
      title: data.title || 'New Message',
      body: data.body || 'You have a new message',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'data-message',
      data: data,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    this.showLocalNotification(options);
  }

  private showLocalNotification(options: PushNotificationOptions): void {
    // If notifications are not supported or permission not granted, use fallback
    if (!this.hasPermission()) {
      if (this.isSupported()) {
        this.updateState({
          lastError: 'Notification permission not granted. Please enable notifications to receive updates.'
        });
      }
      this.showFallbackNotification(options.title, options.body || '', options.data);
      return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
        dir: options.dir,
        lang: options.lang
      });

      notification.onclick = () => {
        this.handleNotificationClick({
          action: '',
          notification: { ...options, title: options.title }
        });
        notification.close();
      };

      notification.onerror = () => {
        // If native notification fails, show fallback
        this.showFallbackNotification(options.title, options.body || '', options.data);
      };

    } catch (error) {
      const errorMessage = `Failed to show notification: ${this.getErrorMessage(error)}`;
      this.updateState({ lastError: errorMessage });

      // Show fallback notification
      this.showFallbackNotification(options.title, options.body || '', options.data);
    }
  }

  // Public API methods
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      const error = this.getServiceWorkerErrorMessage();
      this.updateState({ lastError: error });
      throw new Error(error);
    }

    if (this.permission() === 'denied') {
      const error = 'Notifications are blocked. Please enable them in your browser settings and refresh the page.';
      this.updateState({ lastError: error });
      throw new Error(error);
    }

    try {
      // Check if permission is already granted
      if (this.permission() === 'granted') {
        return 'granted';
      }

      const permission = await Notification.requestPermission();
      this.updateState({
        permission,
        lastError: null
      });

      if (permission === 'denied') {
        const error = 'Permission denied. Notifications are now blocked. To enable them, click the lock icon in your browser\'s address bar and allow notifications.';
        this.updateState({ lastError: error });
      }

      return permission;
    } catch (error) {
      const errorMessage = `Failed to request permission: ${this.getErrorMessage(error)}`;
      this.updateState({ lastError: errorMessage });
      throw new Error(errorMessage);
    }
  }

  async subscribe(serverPublicKey: string): Promise<PushSubscription> {
    if (!this.isSupported()) {
      const error = this.getServiceWorkerErrorMessage();
      this.updateState({ lastError: error });
      throw new Error(error);
    }

    if (!this.hasPermission()) {
      const error = 'Notification permission not granted. Please enable notifications first.';
      this.updateState({ lastError: error });
      throw new Error(error);
    }

    if (!serverPublicKey || serverPublicKey.trim().length === 0) {
      const error = 'Server public key (VAPID key) is required for subscription.';
      this.updateState({ lastError: error });
      throw new Error(error);
    }

    try {
      // Check if already subscribed
      const currentSubscription = this.subscription();
      if (currentSubscription) {
        return currentSubscription;
      }

      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: serverPublicKey.trim()
      });

      this.updateState({
        subscription,
        isEnabled: true,
        lastError: null
      });

      return subscription;
    } catch (error) {
      if (this.isNetworkError(error)) {
        this.handleNetworkError('Subscription');
      } else {
        const errorMessage = `Failed to subscribe: ${this.getErrorMessage(error)}`;
        this.updateState({ lastError: errorMessage });
      }
      throw error;
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      if (!this.subscription()) {
        // Already unsubscribed
        return;
      }

      await this.swPush.unsubscribe();
      this.updateState({
        subscription: null,
        isEnabled: false,
        lastError: null
      });
    } catch (error) {
      if (this.isNetworkError(error)) {
        this.handleNetworkError('Unsubscription');
      } else {
        const errorMessage = `Failed to unsubscribe: ${this.getErrorMessage(error)}`;
        this.updateState({ lastError: errorMessage });
      }
      throw error;
    }
  }

  // Fallback notification system for when push notifications fail
  showFallbackNotification(title: string, body: string, data?: any): void {
    // Create an in-app notification element
    const notification = document.createElement('div');
    notification.className = 'fallback-notification';
    notification.innerHTML = `
      <div class="fallback-notification-content">
        <div class="fallback-notification-header">
          <span class="fallback-notification-icon">🔔</span>
          <strong class="fallback-notification-title">${title}</strong>
          <button class="fallback-notification-close" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="fallback-notification-body">${body}</div>
      </div>
    `;

    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 350px;
      animation: slideInRight 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Add animation styles if not already present
    if (!document.head.querySelector('#fallback-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'fallback-notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .fallback-notification-content {
          padding: 16px;
        }
        .fallback-notification-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .fallback-notification-icon {
          font-size: 18px;
        }
        .fallback-notification-title {
          flex: 1;
          color: #343a40;
          font-size: 14px;
        }
        .fallback-notification-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #6c757d;
          padding: 0;
          width: 20px;
          height: 20px;
        }
        .fallback-notification-close:hover {
          color: #343a40;
        }
        .fallback-notification-body {
          color: #6c757d;
          font-size: 13px;
          line-height: 1.4;
        }
      `;
      document.head.appendChild(style);
    }

    // Add to page
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 5000);

    // Emit event for fallback notification
    this.emitNotificationEvent('fallback-shown', { title, body, data });
  }

  // Test notification for development
  async showTestNotification(options?: Partial<PushNotificationOptions>): Promise<void> {
    const testOptions: PushNotificationOptions = {
      title: 'Test Notification',
      body: 'This is a test notification from your PWA',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `test-${Date.now()}`, // Unique tag to bypass browser suppression
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      ...options
    };

    // Show both native notification AND fallback for testing
    this.showLocalNotification(testOptions);

    // Also show fallback notification with instructions
    setTimeout(() => {
      this.showFallbackNotification(
        '💡 Notification Test Info',
        'If you didn\'t see a system notification, try switching to another tab/app and clicking the test button again. Browsers often suppress notifications when the page is active.'
      );
    }, 1000);
  }

  // Get user-friendly status text
  getStatusText(): string {
    if (!this.isSupported()) return 'Not supported';
    
    switch (this.permission()) {
      case 'granted': return 'Enabled';
      case 'denied': return 'Blocked';
      case 'default': return 'Not requested';
      default: return 'Unknown';
    }
  }

  // Clear last error
  clearError(): void {
    this.updateState({ lastError: null });
  }

  // Utility methods for creating specific notification types
  async showTodoNotification(todo: { id: string; title: string; dueDate?: Date }): Promise<void> {
    const options: PushNotificationOptions = {
      title: '📋 Todo Reminder',
      body: `Don't forget: ${todo.title}`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `todo-${todo.id}`,
      data: {
        type: 'todo-reminder',
        todoId: todo.id,
        route: `/todos/${todo.id}`
      },
      actions: [
        { action: 'todo-complete', title: '✅ Complete', icon: '/icons/check.png' },
        { action: 'todo-snooze', title: '⏰ Snooze 15min', icon: '/icons/snooze.png' },
        { action: 'view', title: '👁️ View', icon: '/icons/view.png' }
      ],
      requireInteraction: true
    };

    this.showLocalNotification(options);
  }

  async showWelcomeNotification(): Promise<void> {
    const options: PushNotificationOptions = {
      title: '🎉 Welcome to Todo PWA!',
      body: 'You can now receive notifications for your todos and updates.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'welcome',
      data: {
        type: 'welcome',
        route: '/dashboard'
      },
      actions: [
        { action: 'view', title: '🚀 Get Started', icon: '/icons/start.png' },
        { action: 'settings', title: '⚙️ Settings', icon: '/icons/settings.png' }
      ]
    };

    this.showLocalNotification(options);
  }

  async showUpdateNotification(version: string): Promise<void> {
    const options: PushNotificationOptions = {
      title: '🔄 App Update Available',
      body: `Version ${version} is ready to install with new features and improvements.`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'app-update',
      data: {
        type: 'app-update',
        version,
        action: 'update'
      },
      actions: [
        { action: 'view', title: '📥 Update Now', icon: '/icons/update.png' },
        { action: 'dismiss', title: '⏭️ Later', icon: '/icons/dismiss.png' }
      ],
      requireInteraction: true
    };

    this.showLocalNotification(options);
  }

  async showOfflineNotification(): Promise<void> {
    const options: PushNotificationOptions = {
      title: '📴 You\'re Offline',
      body: 'Don\'t worry! Your data is saved locally and will sync when you\'re back online.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'offline-status',
      data: {
        type: 'offline-status'
      }
    };

    this.showLocalNotification(options);
  }

  async showOnlineNotification(): Promise<void> {
    const options: PushNotificationOptions = {
      title: '🌐 Back Online!',
      body: 'Your data has been synced successfully.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'online-status',
      data: {
        type: 'online-status'
      }
    };

    this.showLocalNotification(options);
  }

  // Event listener helpers for applications to use
  addEventListener(type: string, callback: (event: CustomEvent) => void): void {
    if (typeof window !== 'undefined') {
      window.addEventListener(`push-notification-${type}`, callback as EventListener);
    }
  }

  removeEventListener(type: string, callback: (event: CustomEvent) => void): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener(`push-notification-${type}`, callback as EventListener);
    }
  }
}
