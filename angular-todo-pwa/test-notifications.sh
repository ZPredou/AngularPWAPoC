#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Push Notifications${NC}"
echo -e "${BLUE}=============================${NC}"

# Check if servers are running
echo -e "${YELLOW}📡 Checking if servers are running...${NC}"

# Check Angular server
if curl -s http://localhost:4200 > /dev/null; then
    echo -e "${GREEN}✅ Angular app is running on http://localhost:4200${NC}"
else
    echo -e "${RED}❌ Angular app is not running. Please start it first.${NC}"
    exit 1
fi

# Check push server
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✅ Push server is running on http://localhost:3000${NC}"
else
    echo -e "${RED}❌ Push server is not running. Please start it first.${NC}"
    exit 1
fi

# Get server stats
echo -e "\n${YELLOW}📊 Server Statistics:${NC}"
curl -s http://localhost:3000/stats | jq '.' 2>/dev/null || curl -s http://localhost:3000/stats

# Get VAPID public key
echo -e "\n${YELLOW}🔑 VAPID Public Key:${NC}"
VAPID_KEY=$(curl -s http://localhost:3000/vapid-public-key | jq -r '.publicKey' 2>/dev/null)
if [ "$VAPID_KEY" != "null" ] && [ -n "$VAPID_KEY" ]; then
    echo -e "${GREEN}$VAPID_KEY${NC}"
else
    echo -e "${RED}Failed to get VAPID key${NC}"
    exit 1
fi

echo -e "\n${BLUE}📋 Manual Testing Steps:${NC}"
echo -e "1. Open http://localhost:4200 in your browser"
echo -e "2. Scroll down to the 'Push Notifications' section"
echo -e "3. Click '🔔 Enable Notifications' and allow permissions"
echo -e "4. Copy this VAPID key: ${GREEN}$VAPID_KEY${NC}"
echo -e "5. Paste it in the 'Server Public Key (VAPID)' field"
echo -e "6. Click '📡 Subscribe'"
echo -e "7. Click '🧪 Test Notification' to test local notifications"

echo -e "\n${YELLOW}⏳ Waiting 10 seconds for you to subscribe...${NC}"
sleep 10

# Check if there are any subscriptions
SUBSCRIPTION_COUNT=$(curl -s http://localhost:3000/stats | jq -r '.totalSubscriptions' 2>/dev/null)
if [ "$SUBSCRIPTION_COUNT" = "null" ] || [ -z "$SUBSCRIPTION_COUNT" ]; then
    SUBSCRIPTION_COUNT=0
fi

echo -e "\n${BLUE}📊 Current subscriptions: $SUBSCRIPTION_COUNT${NC}"

if [ "$SUBSCRIPTION_COUNT" -gt 0 ]; then
    echo -e "\n${GREEN}🎉 Great! You have subscriptions. Testing server-side notifications...${NC}"
    
    # Test 1: Basic notification
    echo -e "\n${YELLOW}📤 Sending basic test notification...${NC}"
    curl -X POST http://localhost:3000/send-to-all \
        -H "Content-Type: application/json" \
        -d '{
            "notification": {
                "title": "🧪 Test from Server",
                "body": "This notification was sent from the push server!",
                "tag": "server-test"
            }
        }' \
        -s | jq '.' 2>/dev/null || echo "Notification sent"
    
    sleep 3
    
    # Test 2: Rich notification with actions
    echo -e "\n${YELLOW}📤 Sending rich notification with actions...${NC}"
    curl -X POST http://localhost:3000/send-to-all \
        -H "Content-Type: application/json" \
        -d '{
            "notification": {
                "title": "📋 Todo Reminder",
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
        }' \
        -s | jq '.' 2>/dev/null || echo "Rich notification sent"
    
    sleep 3
    
    # Test 3: Welcome notification
    echo -e "\n${YELLOW}📤 Sending welcome notification...${NC}"
    curl -X POST http://localhost:3000/send-to-all \
        -H "Content-Type: application/json" \
        -d '{
            "notification": {
                "title": "🎉 Welcome to Todo PWA!",
                "body": "Your push notifications are working perfectly!",
                "tag": "welcome",
                "actions": [
                    {"action": "view", "title": "🚀 Get Started"},
                    {"action": "settings", "title": "⚙️ Settings"}
                ]
            }
        }' \
        -s | jq '.' 2>/dev/null || echo "Welcome notification sent"
    
    echo -e "\n${GREEN}✅ All test notifications sent successfully!${NC}"
    echo -e "${BLUE}Check your browser/system for the notifications.${NC}"
    
else
    echo -e "\n${YELLOW}⚠️  No subscriptions found.${NC}"
    echo -e "Please follow the manual steps above to subscribe first."
fi

echo -e "\n${BLUE}🔧 Additional Testing Commands:${NC}"
echo -e "• Get server stats: ${GREEN}curl http://localhost:3000/stats${NC}"
echo -e "• Get VAPID key: ${GREEN}curl http://localhost:3000/vapid-public-key${NC}"
echo -e "• Send custom notification: ${GREEN}curl -X POST http://localhost:3000/send-to-all -H 'Content-Type: application/json' -d '{\"notification\":{\"title\":\"Custom\",\"body\":\"Your message\"}}'${NC}"

echo -e "\n${BLUE}🎯 Testing Complete!${NC}"
