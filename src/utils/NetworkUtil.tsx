import NetInfo from '@react-native-community/netinfo';

class NetworkUtil {
  constructor() {
    this.isConnected = true;
    this.listeners = [];
    
    // Initialize network status
    NetInfo.fetch().then(state => {
      this.isConnected = state.isConnected;
    });
    
    // Set up listener
    this.unsubscribe = NetInfo.addEventListener(state => {
      const previousState = this.isConnected;
      this.isConnected = state.isConnected;
      
      // Notify listeners only if state changed
      if (previousState !== this.isConnected) {
        this.notifyListeners();
      }
    });
  }
  
  /**
   * Add a listener for network status changes
   * @param {Function} listener - Function to call when network status changes
   * @returns {Function} - Function to remove the listener
   */
  addListener(listener) {
    this.listeners.push(listener);
    
    // Return function to remove listener
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Notify all listeners of network status change
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.isConnected);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  }
  
  /**
   * Check if device is currently connected to the internet
   * @returns {boolean} - True if connected, false otherwise
   */
  isNetworkConnected() {
    return this.isConnected;
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.listeners = [];
  }
}

// Export singleton instance
export default new NetworkUtil();