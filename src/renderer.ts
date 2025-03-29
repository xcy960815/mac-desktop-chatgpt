
declare global {
  interface Window {
    electronAPI: {
      onModelChanged: (callback: (modelName: string) => void) => void;
    };
  }
}

function setWebviewSrc(webviewUrl: string) {
  const webview = document.getElementById('webview-container') as HTMLIFrameElement;
  webview.src = ""
  setTimeout(() => {
    webview.src = `${webviewUrl}`;
  }, 100)
}

window.electronAPI.onModelChanged((modelName: string) => {
  const webviewUrl = modelName === 'DeepSeek'
    ? 'https://chat.deepseek.com/'
    : 'https://chat.openai.com/chat';
    setWebviewSrc(webviewUrl);
});

// setWebviewSrc("https://chat.openai.com/chat");