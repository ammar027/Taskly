// exitApp.web.tsx
const ExitApp = {
  exitApp: () => {
    console.log('Exit app called in web - closing window');
    try {
      window.close();
      
      // Fallback message if the browser blocks window.close()
      setTimeout(() => {
        console.log('Browser may have blocked window.close(). Please close this tab manually.');
      }, 300);
    } catch (error) {
      console.error('Error closing window:', error);
    }
  }
};

export default ExitApp;