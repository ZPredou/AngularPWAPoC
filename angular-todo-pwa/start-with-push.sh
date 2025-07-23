#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Angular Todo PWA with Push Notifications${NC}"
echo -e "${BLUE}=================================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

# Function to cleanup background processes
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down servers...${NC}"
    if [ ! -z "$PUSH_SERVER_PID" ]; then
        kill $PUSH_SERVER_PID 2>/dev/null
        echo -e "${GREEN}✅ Push server stopped${NC}"
    fi
    if [ ! -z "$ANGULAR_PID" ]; then
        kill $ANGULAR_PID 2>/dev/null
        echo -e "${GREEN}✅ Angular server stopped${NC}"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Install Angular dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing Angular dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install Angular dependencies${NC}"
        exit 1
    fi
fi

# Install push server dependencies
if [ ! -d "push-server/node_modules" ]; then
    echo -e "${BLUE}Installing push server dependencies...${NC}"
    cd push-server
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install push server dependencies${NC}"
        exit 1
    fi
    cd ..
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Start push notification server
echo -e "${YELLOW}🔔 Starting push notification server...${NC}"
cd push-server
npm start &
PUSH_SERVER_PID=$!
cd ..

# Wait a moment for the server to start
sleep 2

# Check if push server is running
if ! kill -0 $PUSH_SERVER_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start push notification server${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Push notification server started on http://localhost:3000${NC}"

# Start Angular development server
echo -e "${YELLOW}🅰️ Starting Angular development server...${NC}"
npm start &
ANGULAR_PID=$!

# Wait a moment for the Angular server to start
sleep 3

# Check if Angular server is running
if ! kill -0 $ANGULAR_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Angular server${NC}"
    cleanup
    exit 1
fi

echo -e "${GREEN}✅ Angular server started on http://localhost:4200${NC}"

echo -e "\n${BLUE}🎉 Both servers are running!${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}📱 Angular App: http://localhost:4200${NC}"
echo -e "${GREEN}🔔 Push Server: http://localhost:3000${NC}"
echo -e "${GREEN}📊 Server Stats: http://localhost:3000/stats${NC}"
echo -e "\n${YELLOW}📋 Next Steps:${NC}"
echo -e "1. Open http://localhost:4200 in your browser"
echo -e "2. Navigate to the Push Notifications section"
echo -e "3. Click 'Enable Notifications' and allow permissions"
echo -e "4. Copy the VAPID key from the push server console above"
echo -e "5. Paste the key and click 'Subscribe'"
echo -e "6. Test with the 'Test Notification' button"
echo -e "\n${BLUE}Press Ctrl+C to stop both servers${NC}"

# Wait for user to stop the servers
wait
