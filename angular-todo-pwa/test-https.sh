#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Setting up HTTPS for Push Notification Testing${NC}"
echo -e "${BLUE}===============================================${NC}"

# Check if ngrok is installed
if command -v ngrok &> /dev/null; then
    echo -e "${GREEN}✅ ngrok found, creating HTTPS tunnel...${NC}"
    echo -e "${YELLOW}📝 Instructions:${NC}"
    echo -e "1. This will create an HTTPS tunnel to your local app"
    echo -e "2. Use the HTTPS URL for testing notifications"
    echo -e "3. HTTPS sites have better notification support"
    echo -e "4. Press Ctrl+C to stop the tunnel"
    echo -e "\n${BLUE}Starting tunnel...${NC}"
    ngrok http 4200
else
    echo -e "${YELLOW}⚠️  ngrok not found. Installing options:${NC}"
    echo -e "\n${BLUE}Option 1 - Install ngrok:${NC}"
    echo -e "1. Go to https://ngrok.com/download"
    echo -e "2. Download and install ngrok"
    echo -e "3. Run this script again"
    echo -e "\n${BLUE}Option 2 - Use Chrome flags (less reliable):${NC}"
    echo -e "1. Quit Chrome completely"
    echo -e "2. Start Chrome with: open -a 'Google Chrome' --args --disable-web-security --user-data-dir=/tmp/chrome_dev"
    echo -e "3. This disables some security features for testing"
    echo -e "\n${BLUE}Option 3 - Test in different browser:${NC}"
    echo -e "1. Try Safari or Firefox"
    echo -e "2. They handle localhost notifications differently"
fi
