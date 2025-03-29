
declare global {
  interface Window {
    electronAPI: {
      onModelChanged: (callback: (modelName: string) => void) => void;
    };
  }
}

window.electronAPI.onModelChanged((modelName: string) => {
  const webview = document.getElementById('webview-container') as HTMLIFrameElement;
  const webviewUrl = modelName === 'DeepSeek'
    ? 'https://chat.deepseek.com/'
    : 'https://chat.openai.com/chat';
  webview.src = ""
  setTimeout(() => {
    webview.src = `${webviewUrl}`;
    
  }, 100)
});