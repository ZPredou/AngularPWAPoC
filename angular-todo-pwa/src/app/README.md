# Angular Todo PWA - Project Structure

This project follows Angular's recommended folder structure for small applications with clear separation of concerns.

## 📁 Folder Structure

```
src/app/
├── core/                    # Core functionality (singleton services)
│   ├── services/           # Core services (device detection, etc.)
│   └── index.ts           # Barrel exports for core module
├── shared/                 # Shared resources
│   ├── models/            # Shared interfaces and types
│   └── index.ts          # Barrel exports for shared module
├── features/              # Feature modules
│   └── todo/             # Todo feature
│       ├── todo-list.component.ts
│       ├── todo-list.component.html
│       ├── todo-list.component.css
│       ├── todo.service.ts
│       └── index.ts      # Barrel exports for todo feature
├── app.config.ts         # App configuration
├── app.routes.ts         # App routing
├── app.ts               # Root component
├── app.html            # Root template
├── app.css            # Root styles
└── README.md         # This file
```

## 🏗️ Architecture Principles

### Core Module (`/core`)
- Contains singleton services that are used throughout the app
- Services here are provided at the root level
- Example: `DeviceDetectionService`

### Shared Module (`/shared`)
- Contains reusable components, pipes, directives, and models
- Can be imported by feature modules
- Example: `Todo` interface

### Feature Modules (`/features`)
- Each feature has its own folder
- Contains components, services, and other assets specific to that feature
- Example: Todo feature with `TodoListComponent` and `TodoService`

### Barrel Exports (`index.ts`)
- Each module has an `index.ts` file for clean imports
- Allows importing from module root instead of deep paths
- Example: `import { Todo } from '../../shared'` instead of `import { Todo } from '../../shared/models/todo.interface'`

## 🔄 Import Patterns

### ✅ Good (using barrel exports)
```typescript
import { DeviceDetectionService } from '../../core';
import { Todo } from '../../shared';
import { TodoService } from './todo.service';
```

### ❌ Avoid (deep imports)
```typescript
import { DeviceDetectionService } from '../../core/services/device-detection.service';
import { Todo } from '../../shared/models/todo.interface';
```

## 🚀 Benefits

1. **Scalability**: Easy to add new features and modules
2. **Maintainability**: Clear separation of concerns
3. **Reusability**: Shared components and services are easily accessible
4. **Clean Imports**: Barrel exports make imports cleaner and more maintainable
5. **Angular Style Guide**: Follows official Angular recommendations

## 📱 Features

- **Device Detection**: Responsive design based on device type and screen size
- **Todo Management**: Add, toggle, delete, and clear todos
- **PWA Support**: Service worker for offline functionality
- **Modern Angular**: Uses Signals, standalone components, and zoneless change detection
