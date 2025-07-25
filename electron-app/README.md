# AI Explainer Desktop

A desktop application built with Electron.js and React, based on the GemmaHackathon frontend. This app provides an AI-powered learning platform with topics, lessons, flashcards, and quizzes.

## Features

- **Topic Exploration**: Browse and search through various learning topics
- **Interactive Lessons**: Learn with structured lessons and key concepts
- **Flashcards**: Review important terms and definitions
- **Quizzes**: Test your knowledge with interactive quizzes
- **Progress Tracking**: Monitor your learning progress and statistics
- **Offline Support**: Works offline with local data storage

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Desktop**: Electron.js
- **Build Tool**: Vite
- **UI Components**: Radix UI, Lucide React Icons
- **Database**: SQLite (connected to v1 backend)

## Prerequisites

- Node.js 18+ 
- npm or yarn
- The v1 backend database (llm_app.db)

## Installation

1. Clone the repository and navigate to the electron-app directory:
```bash
cd electron-app
```

2. Install dependencies:
```bash
npm install
```

3. Make sure the v1 backend database exists:
```bash
# The database should be at ../v1/llm_app.db
ls ../v1/llm_app.db
```

## Development

To run the app in development mode:

```bash
npm run dev
```

This will:
- Start the Vite development server on port 3000
- Launch the Electron app in development mode
- Enable hot reloading for both React and Electron

## Building for Distribution

The app supports building for multiple platforms. All build artifacts are created in the `dist/` directory and are automatically ignored by Git.

### Prerequisites for Building

- Node.js 18+
- npm or yarn
- Platform-specific requirements (see below)

### Development Build

To build the app for development/testing:

```bash
npm run build
```

This will:
- Build the React app with Vite
- Package the app with Electron Builder for your current platform
- Create distributable files in the `dist` directory

### Platform-Specific Builds

#### macOS Builds

**For Apple Silicon Macs (M1/M2/M3 - ARM64):**
```bash
npm run dist:mac
```

**For Intel Macs (x64):**
```bash
npm run dist:mac -- --x64
```

**Build Outputs:**
- `AI Explainer Desktop-1.0.0-arm64.dmg` - ARM64 DMG installer
- `AI Explainer Desktop-1.0.0-arm64-mac.zip` - ARM64 ZIP archive
- `AI Explainer Desktop-1.0.0.dmg` - Intel x64 DMG installer (when using --x64)
- `AI Explainer Desktop-1.0.0-mac.zip` - Intel x64 ZIP archive (when using --x64)
- `mac-arm64/AI Explainer Desktop.app` - ARM64 app bundle
- `mac/AI Explainer Desktop.app` - Intel x64 app bundle (when using --x64)

#### Windows Builds

**For Windows x64:**
```bash
npm run dist:win -- --x64
```

**Build Outputs:**
- `AI Explainer Desktop Setup 1.0.0.exe` - NSIS installer (~704MB)
- `win-unpacked/AI Explainer Desktop.exe` - Portable executable
- `*.blockmap` files - For auto-updater support

**Note:** Windows builds can be created from macOS, but code signing requires Windows-specific certificates.

#### Linux Builds

**For Linux x64:**
```bash
npm run dist:linux
```

**Build Outputs:**
- `AI Explainer Desktop-1.0.0.AppImage` - Portable Linux application

### Build All Platforms

To build for all supported platforms:

```bash
# Build macOS ARM64
npm run dist:mac

# Build macOS Intel
npm run dist:mac -- --x64

# Build Windows
npm run dist:win -- --x64

# Build Linux
npm run dist:linux
```

### Build Configuration

Build settings are configured in `package.json` under the `"build"` section:

- **App ID**: `com.yourapp.ai-explainer-desktop`
- **Product Name**: `AI Explainer Desktop`
- **macOS**: DMG and ZIP formats, unsigned for development
- **Windows**: NSIS installer format
- **Linux**: AppImage format

### Distribution Notes

1. **File Sizes**: 
   - macOS ARM64 builds: ~200MB
   - macOS Intel builds: ~800MB
   - Windows builds: ~700MB

2. **Code Signing**: Currently disabled for development. For production:
   - macOS: Configure Apple Developer certificates
   - Windows: Configure code signing certificates

3. **Auto-Updates**: Block map files are generated for future auto-update support

4. **Architecture Support**:
   - macOS: ARM64 (Apple Silicon) and x64 (Intel)
   - Windows: x64 only
   - Linux: x64 only

## Project Structure

```
electron-app/
├── src/
│   ├── components/ui/     # UI components (Button, Card, Input, etc.)
│   ├── lib/              # Utilities and database service
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx           # Main React application
│   ├── index.tsx         # React entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── main.js               # Electron main process
├── preload.js            # Electron preload script
├── package.json          # Dependencies and scripts
├── vite.config.ts        # Vite configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Database Integration

The app is designed to work with the SQLite database from the v1 backend. The database service (`src/lib/database.ts`) provides methods to:

- Get all topics
- Get topic details with lessons, flashcards, and quizzes
- Search topics
- Get database statistics

## Customization

### Adding New Topics

Topics are defined in the database service. To add new topics:

1. Update the `getTopics()` method in `src/lib/database.ts`
2. Add corresponding topic details in `getTopicDetails()`

### Styling

The app uses Tailwind CSS for styling. Custom styles can be added in `src/index.css`.

### UI Components

New UI components can be added in `src/components/ui/` following the existing pattern.

## Scripts

### Development
- `npm run dev` - Start development server with hot reloading
- `npm run dev:renderer` - Start only the Vite development server
- `npm run dev:electron` - Start only the Electron app (requires renderer running)

### Building
- `npm run build` - Build for current platform
- `npm run build:renderer` - Build only the React app
- `npm run build:electron` - Build only the Electron app
- `npm run start` - Start Electron app (requires built files)

### Distribution
- `npm run dist` - Create distributable packages for current platform
- `npm run dist:dir` - Create unpacked directory (for testing)
- `npm run dist:mac` - Build for macOS (ARM64 by default)
- `npm run dist:mac -- --x64` - Build for macOS Intel
- `npm run dist:win -- --x64` - Build for Windows x64
- `npm run dist:linux` - Build for Linux x64

### Utilities
- `npm run postinstall` - Install app dependencies (runs automatically)

## Troubleshooting

### Common Issues

1. **Database not found**: Make sure the v1 backend database exists at `../v1/llm_app.db`
2. **Port 3000 in use**: Change the port in `vite.config.ts` and update the wait-on URL in package.json
3. **Build errors**: Make sure all dependencies are installed with `npm install`

### Development Tips

- Use the Electron DevTools for debugging (available in development mode)
- Check the console for database connection errors
- The app uses mock data by default - implement actual database queries as needed

## License

MIT License - see LICENSE file for details