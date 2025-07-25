declare global {
  interface Window {
    electronAPI: {
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, content: string) => Promise<void>;
      exportData: (format: string) => Promise<string>;
      importData: (path: string) => Promise<any>;
      getSetting: (key: string) => Promise<any>;
      setSetting: (key: string, value: any) => Promise<void>;
      showNotification: (options: any) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      createBackup: () => Promise<string>;
      restoreBackup: (path: string) => Promise<any>;
      exportProgress: (topicId: string) => Promise<string>;
    };
  }
}

export {};