export { }

declare global {
    interface Window {
        electronAPI: {
            onModelChanged: (callback: (modelName: string) => void) => void;
        };
    }
}


function setWebviewSrc(modelName: string) {
    const webview = document.getElementById('webview-container') as HTMLIFrameElement;
    const webviewLoading = document.getElementById('webview-loading') as HTMLDivElement;
    const originWebviewUrl = webview?.src;

    if (originWebviewUrl && originWebviewUrl.includes(modelName.toLocaleLowerCase())) return;
    const webviewUrl = modelName === 'DeepSeek'
        ? 'https://chat.deepseek.com/'
        : 'https://chat.openai.com/chat';
    // 显示 webviewLoading
    webviewLoading.classList.add('active');
    webview.src = `${webviewUrl}`;
    // 监听 webview 加载完成
    webview.addEventListener('did-stop-loading', () => {
        webviewLoading.classList.remove('active');
    });

}

window.electronAPI.onModelChanged(setWebviewSrc);
