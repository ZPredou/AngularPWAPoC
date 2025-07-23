# 🚀 Quick Command Reference

## **Main Commands**

### **🎯 Start the PWA (Recommended)**
```bash
npm start
```
**What it does:**
- ✅ Builds the app for production
- ✅ Starts server on http://localhost:4200
- ✅ Opens browser automatically
- ✅ Enables ALL PWA features (offline, notifications, install)

---

### **🔧 Development Mode**
```bash
npm run start:dev
```
**What it does:**
- ⚠️ Development server (no PWA features)
- ⚠️ Service worker disabled
- ⚠️ No offline functionality
- ✅ Hot reload for development

---

### **🧹 Fresh Start**
```bash
npm run fresh-start
```
**What it does:**
- 🗑️ Cleans previous build
- 🔨 Fresh build
- 🚀 Starts server

---

## **Individual Commands**

### **Build Commands**
```bash
npm run build          # Production build
npm run build:prod     # Same as above
npm run clean          # Remove dist folder
```

### **Serve Commands**
```bash
npm run serve          # Serve built app (with logs)
npm run serve:quiet    # Serve built app (minimal logs)
```

---

## **🎯 Which Command Should I Use?**

### **For PWA Testing & Demo:**
```bash
npm start
```
**✅ Use this for:**
- Testing PWA features
- Showing the app to others
- Testing offline functionality
- Testing notifications
- Testing app installation

### **For Development:**
```bash
npm run start:dev
```
**✅ Use this for:**
- Writing code
- Making changes
- Hot reload development
- Debugging

### **For Clean Slate:**
```bash
npm run fresh-start
```
**✅ Use this when:**
- Build seems corrupted
- Want to start fresh
- Clearing cache issues

---

## **🌐 Access URLs**

After running `npm start`, your app is available at:
- **Local:** http://localhost:4200
- **Network:** http://192.168.1.75:4200 (for mobile testing)

---

## **🔍 Troubleshooting**

### **App won't load?**
```bash
npm run fresh-start
```

### **PWA features not working?**
Make sure you're using:
```bash
npm start  # NOT npm run start:dev
```

### **Want to stop the server?**
Press `Ctrl+C` in the terminal

### **Port 4200 already in use?**
The server will automatically find another port and show you the URL.

---

## **📱 Testing Checklist**

After running `npm start`:

1. **✅ Install the App**
   - Look for "Install App" button
   - Or use browser's install button

2. **✅ Test Notifications**
   - Expand "🔔 Notification Tester"
   - Click "Enable Notifications"
   - Try different notification types

3. **✅ Test Offline**
   - Disconnect internet
   - Add/edit todos (should work!)
   - Reconnect to see sync

4. **✅ Check PWA Status**
   - Expand "PWA Status" panel
   - See connection status
   - Monitor features

---

## **🎉 That's It!**

**Most of the time, you just need:**
```bash
npm start
```

**Happy coding!** 🚀
