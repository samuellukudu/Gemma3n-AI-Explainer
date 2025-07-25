import { useState, useEffect } from 'react';



export function useDesktopAPI() {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(!!window.electronAPI);
  }, []);

  const exportUserData = async (format: 'json' | 'csv' | 'pdf') => {
    if (!isElectron) {
      throw new Error('Export only available in desktop app');
    }
    return await window.electronAPI.exportData(format);
  };

  const importUserData = async (filePath: string) => {
    if (!isElectron) {
      throw new Error('Import only available in desktop app');
    }
    return await window.electronAPI.importData(filePath);
  };

  const createBackup = async () => {
    if (!isElectron) {
      throw new Error('Backup only available in desktop app');
    }
    return await window.electronAPI.createBackup();
  };

  const showNotification = async (title: string, body: string) => {
    if (!isElectron) return;
    await window.electronAPI.showNotification({ title, body });
  };

  return {
    isElectron,
    exportUserData,
    importUserData,
    createBackup,
    showNotification,
    // Add other methods as needed
  };
}