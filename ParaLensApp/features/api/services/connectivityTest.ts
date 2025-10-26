import { httpClient } from './httpClient';

export class ConnectivityTest {
  /**
   * Test basic connectivity to the backend
   */
  static async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('Testing connectivity to backend...');
      
      // Try to get the scans list (this should be a simple GET request)
      const response = await httpClient.get('/api/scans');
      
      console.log('Backend connection successful!');
      console.log('Response:', response);
      
      return {
        success: true,
        details: response
      };
    } catch (error) {
      console.error('Backend connection failed:', error);
      
      const errorDetails = {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      };
      
      console.error('Error details:', errorDetails);
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Cannot connect to server. Please check:\n1. Backend is running on http://localhost:5200\n2. No firewall blocking the connection\n3. Using correct network interface (not localhost if on physical device)';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout. Server may be slow to respond';
        } else if (error.message.includes('CORS')) {
          errorMessage = 'CORS error. Backend may not allow requests from this origin';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        details: errorDetails
      };
    }
  }

  /**
   * Test if the backend is reachable with a simple ping
   */
  static async pingBackend(): Promise<boolean> {
    try {
      // Try a simple request to see if the server responds
      await fetch('http://localhost:5200/api/scans', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      return true;
    } catch (error) {
      console.error('Ping failed:', error);
      return false;
    }
  }
}

export default ConnectivityTest;
