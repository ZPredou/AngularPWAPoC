import { Injectable, signal, computed, inject } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
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
    // Disable auto-subscribe for now - let user manually subscribe
    // this.autoSubscribeIfPermissionGranted();
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
      console.log('🔄 Starting subscription process...');

      // Check if already subscribed
      const currentSubscription = this.subscription();
      if (currentSubscription) {
        console.log('✅ Already subscribed, ensuring server knows about it...');
        // Make sure the server knows about this subscription
        await this.sendSubscriptionToServer(currentSubscription);
        return currentSubscription;
      }

      console.log('📱 Requesting new subscription from browser...');
      console.log('🔍 Service worker isEnabled:', this.swPush.isEnabled);
      console.log('🔍 Service worker subscription observable:', this.swPush.subscription);

      // First, unsubscribe from any existing subscription to avoid conflicts
      console.log('🧹 Clearing any existing subscriptions...');
      try {
        await this.swPush.unsubscribe();
        console.log('✅ Existing subscription cleared');
      } catch (error) {
        console.log('ℹ️ No existing subscription to clear');
      }

      // Wait for service worker to be ready
      await this.waitForServiceWorker();

      // Wait a bit more for service worker to stabilize
      console.log('⏳ Waiting for service worker to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Service worker is ready, requesting subscription...');
      console.log('🔑 Using VAPID key:', serverPublicKey.trim());

      // Add timeout to prevent hanging
      const subscriptionPromise = this.swPush.requestSubscription({
        serverPublicKey: serverPublicKey.trim()
      });

      console.log('⏳ Subscription promise created, waiting for response...');

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          console.error('⏰ Subscription request timed out after 5 seconds');
          reject(new Error('Subscription request timed out after 5 seconds. This usually means the browser is not ready for push subscriptions. Try refreshing the page and ensuring notifications are enabled in your browser settings.'));
        }, 5000);
      });

      console.log('🏁 Racing subscription vs timeout...');
      const subscription = await Promise.race([subscriptionPromise, timeoutPromise]) as PushSubscription;
      console.log('🎯 Promise race completed!');

      console.log('✅ Browser subscription created:', subscription);

      // Send subscription to the push server
      console.log('📡 Sending subscription to server...');
      await this.sendSubscriptionToServer(subscription);

      console.log('✅ Updating local state...');
      this.updateState({
        subscription,
        isEnabled: true,
        lastError: null
      });

      console.log('🎉 Subscription process completed successfully!');
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
      const currentSubscription = this.subscription();
      if (!currentSubscription) {
        // Already unsubscribed
        return;
      }

      // Remove subscription from server first
      await this.removeSubscriptionFromServer(currentSubscription);

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

  // Send subscription to push server
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    console.log('📤 Sending subscription to server:', subscription);

    try {
      // Convert subscription to JSON format that the server expects
      const subscriptionJSON = subscription.toJSON();
      console.log('📤 Subscription JSON to send:', subscriptionJSON);

      const response = await fetch('http://localhost:3000/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionJSON)
      });

      console.log('📡 Server response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Subscription sent to server successfully:', result);
    } catch (error) {
      console.error('❌ Failed to send subscription to server:', error);
      throw new Error(`Failed to register subscription with server: ${this.getErrorMessage(error)}`);
    }
  }

  // Remove subscription from push server
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('http://localhost:3000/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Subscription removed from server:', result);
    } catch (error) {
      console.error('❌ Failed to remove subscription from server:', error);
      // Don't throw here - we still want to unsubscribe locally even if server fails
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

  // Auto-subscribe if permission is already granted
  private async autoSubscribeIfPermissionGranted(): Promise<void> {
    // Wait a bit for the service to initialize
    setTimeout(async () => {
      try {
        if (this.hasPermission() && !this.isEnabled()) {
          const vapidKey = await this.getVapidKeyFromServer();
          if (vapidKey) {
            await this.subscribe(vapidKey);
          }
        }
      } catch (error) {
        // Silently fail - this is just a convenience feature
        console.log('Auto-subscribe failed:', error);
      }
    }, 1000);
  }

  // Get VAPID key from the push server
  private async getVapidKeyFromServer(): Promise<string | null> {
    try {
      const response = await fetch('http://localhost:3000/vapid-public-key');
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      const data = await response.json();
      return data.publicKey;
    } catch (error) {
      console.error('Failed to get VAPID key from server:', error);
      return null;
    }
  }

  // Public method to get VAPID key (for UI)
  async getVapidKey(): Promise<string | null> {
    return this.getVapidKeyFromServer();
  }

  // Wait for service worker to be ready
  private async waitForServiceWorker(): Promise<void> {
    if (this.swPush.isEnabled) {
      return; // Already ready
    }

    console.log('⏳ Waiting for service worker to be ready...');

    // Wait up to 30 seconds for service worker to be ready
    const maxWaitTime = 30000;
    const checkInterval = 500;
    const startTime = Date.now();

    while (!this.swPush.isEnabled && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    if (!this.swPush.isEnabled) {
      throw new Error('Service Worker failed to initialize within 30 seconds');
    }

    console.log('✅ Service worker is now ready!');
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
