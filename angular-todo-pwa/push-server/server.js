import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import webPush from 'web-push';

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Generate VAPID keys (in production, these should be stored securely)
const vapidKeys = webPush.generateVAPIDKeys();

// Configure web-push with VAPID details
webPush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Store subscriptions in memory (in production, use a database)
const subscriptions = new Set();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Push Notification Server is running!',
    endpoints: {
      vapidPublicKey: '/vapid-public-key',
      subscribe: 'POST /subscribe',
      unsubscribe: 'POST /unsubscribe',
      sendNotification: 'POST /send-notification',
      sendToAll: 'POST /send-to-all'
    }
  });
});

// Get VAPID public key
app.get('/vapid-public-key', (req, res) => {
  res.json({
    publicKey: vapidKeys.publicKey
  });
});

// Subscribe to push notifications
app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({
      error: 'Invalid subscription object'
    });
  }

  // Add subscription to our store
  subscriptions.add(JSON.stringify(subscription));
  
  console.log('New subscription added:', subscription.endpoint);
  console.log('Total subscriptions:', subscriptions.size);
  
  res.status(201).json({
    message: 'Subscription added successfully'
  });
});

// Unsubscribe from push notifications
app.post('/unsubscribe', (req, res) => {
  const subscription = req.body;
  
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({
      error: 'Invalid subscription object'
    });
  }

  // Remove subscription from our store
  const subscriptionString = JSON.stringify(subscription);
  const deleted = subscriptions.delete(subscriptionString);
  
  if (deleted) {
    console.log('Subscription removed:', subscription.endpoint);
    console.log('Total subscriptions:', subscriptions.size);
    res.json({ message: 'Subscription removed successfully' });
  } else {
    res.status(404).json({ error: 'Subscription not found' });
  }
});

// Send notification to a specific subscription
app.post('/send-notification', async (req, res) => {
  const { subscription, notification } = req.body;
  
  if (!subscription || !notification) {
    return res.status(400).json({
      error: 'Subscription and notification data are required'
    });
  }

  try {
    await webPush.sendNotification(subscription, JSON.stringify({
      notification: {
        title: notification.title || 'Test Notification',
        body: notification.body || 'This is a test notification',
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: notification.tag || 'test',
        data: notification.data || {},
        actions: notification.actions || []
      }
    }));

    console.log('Notification sent successfully');
    res.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      details: error.message
    });
  }
});

// Send notification to all subscribers
app.post('/send-to-all', async (req, res) => {
  const { notification } = req.body;
  
  if (!notification) {
    return res.status(400).json({
      error: 'Notification data is required'
    });
  }

  if (subscriptions.size === 0) {
    return res.status(400).json({
      error: 'No subscriptions available'
    });
  }

  const payload = JSON.stringify({
    notification: {
      title: notification.title || 'Broadcast Notification',
      body: notification.body || 'This is a broadcast notification',
      icon: notification.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: notification.tag || 'broadcast',
      data: notification.data || {},
      actions: notification.actions || [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    }
  });

  const promises = Array.from(subscriptions).map(async (subscriptionString) => {
    try {
      const subscription = JSON.parse(subscriptionString);
      await webPush.sendNotification(subscription, payload);
      return { success: true, endpoint: subscription.endpoint };
    } catch (error) {
      console.error('Failed to send to subscription:', error);
      // Remove invalid subscriptions
      subscriptions.delete(subscriptionString);
      return { success: false, error: error.message };
    }
  });

  try {
    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Broadcast sent: ${successful} successful, ${failed} failed`);
    console.log('Remaining subscriptions:', subscriptions.size);

    res.json({
      message: 'Broadcast completed',
      successful,
      failed,
      totalSubscriptions: subscriptions.size
    });
  } catch (error) {
    console.error('Error in broadcast:', error);
    res.status(500).json({
      error: 'Failed to send broadcast',
      details: error.message
    });
  }
});

// Get server stats
app.get('/stats', (req, res) => {
  res.json({
    totalSubscriptions: subscriptions.size,
    vapidPublicKey: vapidKeys.publicKey.substring(0, 20) + '...',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Push Notification Server running at http://localhost:${port}`);
  console.log(`📊 Stats available at http://localhost:${port}/stats`);
  console.log(`🔑 VAPID Public Key: ${vapidKeys.publicKey}`);
  console.log('\n📋 Available endpoints:');
  console.log('  GET  /                    - Server info');
  console.log('  GET  /vapid-public-key    - Get VAPID public key');
  console.log('  POST /subscribe           - Subscribe to notifications');
  console.log('  POST /unsubscribe         - Unsubscribe from notifications');
  console.log('  POST /send-notification   - Send to specific subscription');
  console.log('  POST /send-to-all         - Broadcast to all subscribers');
  console.log('  GET  /stats               - Server statistics');
  console.log('  GET  /health              - Health check');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
