# Modern Push Notifications for Angular PWA

This project now includes a state-of-the-art push notification system built with Angular's `SwPush` service and modern web standards.

## 🚀 Features

- **Modern Angular Integration**: Uses Angular's `SwPush` service from `@angular/service-worker`
- **Comprehensive Error Handling**: Graceful fallbacks for unsupported browsers and blocked permissions
- **Rich Notification Support**: Actions, icons, badges, and custom data
- **Fallback System**: In-app notifications when browser notifications are blocked
- **Event-Driven Architecture**: Custom events for notification interactions
- **Production Ready**: Proper error handling, network failure recovery, and user feedback

## 🏗️ Architecture

### Core Components

1. **PushNotificationService** (`src/app/core/services/push-notification.service.ts`)
   - Modern service using Angular's `SwPush`
   - Comprehensive error handling and fallbacks
   - Rich notification support with actions
   - Event-driven notification click handling

2. **PushNotificationsComponent** (`src/app/shared/components/push-notifications/push-notifications.component.ts`)
   - Modern UI for managing push notifications
   - Permission management with clear instructions
   - VAPID key input and subscription management
   - Real-time status updates and error display

3. **Demo Server** (`push-server/server.js`)
   - Node.js server with Express
   - VAPID key generation and management
   - Subscription management
   - Broadcast and targeted notifications

## 🛠️ Setup Instructions

### 1. Start the Push Notification Server

```bash
cd push-server
npm install
npm start
```

The server will start on `http://localhost:3000` and display the VAPID public key.

### 2. Configure the Angular App

1. The service worker is already configured for development mode
2. Open the app in your browser: `http://localhost:4200`
3. Navigate to the Push Notifications section

### 3. Enable Push Notifications

1. **Request Permission**: Click "Enable Notifications" to request browser permission
2. **Get VAPID Key**: Copy the VAPID public key from the server console or visit `http://localhost:3000/vapid-public-key`
3. **Subscribe**: Paste the VAPID key and click "Subscribe"
4. **Test**: Click "Test Notification" to verify everything works

## 📱 Usage Examples

### Basic Test Notification

```bash
curl -X POST http://localhost:3000/send-to-all \
  -H "Content-Type: application/json" \
  -d '{
    "notification": {
      "title": "Hello from PWA!",
      "body": "This is a test notification",
      "tag": "test"
    }
  }'
```

### Rich Notification with Actions

```bash
curl -X POST http://localhost:3000/send-to-all \
  -H "Content-Type: application/json" \
  -d '{
    "notification": {
      "title": "Todo Reminder",
      "body": "Don'\''t forget to complete your tasks!",
      "tag": "todo-reminder",
      "actions": [
        {"action": "view", "title": "View Todos"},
        {"action": "dismiss", "title": "Dismiss"}
      ],
      "data": {
        "url": "/todos",
        "type": "todo-reminder"
      }
    }
  }'
```

## 🔧 Integration with Your App

### Listen to Notification Events

```typescript
import { PushNotificationService } from './core/services/push-notification.service';

export class MyComponent {
  constructor(private pushService: PushNotificationService) {
    // Listen for notification clicks
    this.pushService.addEventListener('click', (event) => {
      console.log('Notification clicked:', event.detail);
    });

    // Listen for todo completion actions
    this.pushService.addEventListener('todo-complete', (event) => {
      const { todoId } = event.detail;
      this.completeTodo(todoId);
    });
  }
}
```

### Show Custom Notifications

```typescript
// Show a todo reminder
await this.pushService.showTodoNotification({
  id: 'todo-123',
  title: 'Complete project documentation'
});

// Show a welcome notification
await this.pushService.showWelcomeNotification();

// Show a custom test notification
await this.pushService.showTestNotification({
  title: 'Custom Test',
  body: 'This is a custom test notification',
  actions: [
    { action: 'custom', title: 'Custom Action' }
  ]
});
```

## 🎯 Key Improvements Over Previous Implementation

### 1. **Modern Angular Integration**
- Uses Angular's built-in `SwPush` service
- Proper integration with Angular's service worker
- Reactive patterns with signals and computed values

### 2. **Comprehensive Error Handling**
- Graceful handling of unsupported browsers
- Clear error messages for different failure scenarios
- Network error detection and recovery
- Fallback in-app notifications

### 3. **Rich User Experience**
- Modern UI with clear status indicators
- Step-by-step permission and subscription flow
- Browser-specific instructions for enabling notifications
- Real-time feedback and error display

### 4. **Production Ready**
- Proper VAPID key management
- Subscription lifecycle management
- Event-driven architecture for extensibility
- Comprehensive logging and debugging

## 🔍 Troubleshooting

### Notifications Not Appearing

1. **Check Browser Support**: Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)
2. **Verify HTTPS**: Notifications require HTTPS (localhost is exempt)
3. **Check Permissions**: Ensure notifications are allowed in browser settings
4. **Service Worker**: Verify the service worker is registered and active
5. **VAPID Key**: Ensure the correct VAPID public key is used

### Common Issues

- **"Service Worker not supported"**: Update to a modern browser
- **"Permission denied"**: Enable notifications in browser settings and refresh
- **"Failed to subscribe"**: Check VAPID key format and network connection
- **"Notifications blocked"**: Follow browser-specific instructions to unblock

### Debug Mode

Enable debug logging by opening browser DevTools and checking:
- **Application > Service Workers**: Verify service worker is active
- **Application > Push Messaging**: Monitor push message events
- **Application > Notifications**: Track notification display events

## 🚀 Next Steps

1. **Backend Integration**: Connect to your real backend API
2. **User Preferences**: Add notification preference management
3. **Scheduling**: Implement scheduled notifications
4. **Analytics**: Track notification engagement
5. **A/B Testing**: Test different notification strategies

## 📚 Resources

- [Angular Service Worker Guide](https://angular.dev/ecosystem/service-workers)
- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
- [Push API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
