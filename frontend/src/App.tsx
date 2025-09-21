import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  const testConnection = async () => {
    const endpoints = [
      'http://localhost:3000/health',
      'http://127.0.0.1:3000/health'
    ];
    
    setConnectionStatus('Testing connection...');
    console.log('Testing backend connection...');
    
    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      try {
        console.log(`Trying endpoint ${i + 1}/${endpoints.length}: ${endpoint}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch(endpoint, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          setConnectionStatus(`✅ Backend connected successfully (${endpoint})`);
          console.log('Backend health check successful:', data);
          return; // Success, exit the loop
        } else {
          console.error(`Endpoint ${endpoint} responded with error:`, response.status, response.statusText);
        }
      } catch (error) {
        console.error(`Connection to ${endpoint} failed:`, error);
        if (i === endpoints.length - 1) {
          // This was the last endpoint, show error
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
            setConnectionStatus('❌ Network error - Backend may not be accessible from browser');
          } else if (errorMessage.includes('AbortError')) {
            setConnectionStatus('❌ Connection timeout - Backend is not responding');
          } else {
            setConnectionStatus(`❌ All connection attempts failed: ${errorMessage}`);
          }
        }
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('audio', file);

    const endpoints = [
      'http://localhost:3000/api/upload',
      'http://127.0.0.1:3000/api/upload'
    ];

    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      try {
        console.log(`Trying upload to endpoint ${i + 1}/${endpoints.length}: ${endpoint}`);
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          mode: 'cors',
        });

        console.log('Response received:', response.status, response.statusText);
        const result = await response.json();
        
        if (response.ok) {
          setJobId(result.jobId);
          alert('Upload successful! Job ID: ' + result.jobId);
          setUploading(false);
          return; // Success, exit the loop
        } else {
          console.error('Upload error:', result);
          if (i === endpoints.length - 1) {
            alert('Upload failed: ' + result.message);
          }
        }
      } catch (error) {
        console.error(`Upload to ${endpoint} failed:`, error);
        if (i === endpoints.length - 1) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          alert('Upload failed - Network Error: ' + errorMessage + '\n\nPlease ensure the backend server is running on port 3000.');
        }
      }
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div>
              <h1 className="text-2xl font-semibold text-center">🎤 KarokeMaker v2</h1>
              <p className="text-center text-gray-600 mt-2">
                Convert your MP3 to karaoke format
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <div className="flex flex-col space-y-4">
                  
                  {/* Connection Test Section */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Backend Connection:</span>
                      <button
                        onClick={testConnection}
                        className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        Test
                      </button>
                    </div>
                    {connectionStatus && (
                      <div className="mt-2 text-xs text-gray-600">
                        {connectionStatus}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select MP3 File
                    </label>
                    <input
                      type="file"
                      accept=".mp3,audio/mpeg"
                      onChange={handleFileSelect}
                      className="mt-1 block w-full text-sm text-gray-500
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-full file:border-0
                               file:text-sm file:font-semibold
                               file:bg-blue-50 file:text-blue-700
                               hover:file:bg-blue-100"
                    />
                  </div>
                  
                  {file && (
                    <div className="text-sm text-gray-600">
                      Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? 'Uploading...' : 'Convert to Karaoke'}
                  </button>

                  {jobId && (
                    <div className="p-4 bg-green-50 rounded-md">
                      <p className="text-sm text-green-700">
                        Upload successful! Job ID: {jobId}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Processing will begin shortly...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
