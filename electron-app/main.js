const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for database operations
ipcMain.handle('get-topics', async () => {
  // This will be implemented to connect to the SQLite database
  return [];
});

ipcMain.handle('get-topic-details', async (event, topicId) => {
  // This will be implemented to get topic details from database
  return null;
});

ipcMain.handle('search-topics', async (event, searchTerm) => {
  // This will be implemented to search topics
  return [];
});

ipcMain.handle('get-lessons', async (event, topicId) => {
  // This will be implemented to get lessons for a topic
  return [];
});

ipcMain.handle('get-flashcards', async (event, lessonId) => {
  // This will be implemented to get flashcards for a lesson
  return [];
});

ipcMain.handle('get-quizzes', async (event, flashcardSetId) => {
  // This will be implemented to get quizzes
  return [];
});