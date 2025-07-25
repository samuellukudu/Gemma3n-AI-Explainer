const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  getTopics: () => ipcRenderer.invoke('get-topics'),
  getTopicDetails: (topicId) => ipcRenderer.invoke('get-topic-details', topicId),
  searchTopics: (searchTerm) => ipcRenderer.invoke('search-topics', searchTerm),
  getLessons: (topicId) => ipcRenderer.invoke('get-lessons', topicId),
  getFlashcards: (lessonId) => ipcRenderer.invoke('get-flashcards', lessonId),
  getQuizzes: (flashcardSetId) => ipcRenderer.invoke('get-quizzes', flashcardSetId),
  
  // App operations
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  
  // File operations
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  
  // Platform info
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development'
}); 