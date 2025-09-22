import { useState, useEffect } from 'react';
import './App.css';
import KaraokePlayer from './components/KaraokePlayer';

interface Job {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  results?: {
    karaokeFile: string;
    instrumentalFile: string;
    lyricsFile: string;
    processedDir: string;
  };
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [showKaraoke, setShowKaraoke] = useState(false);
  const [lyricsContent, setLyricsContent] = useState<string>('');

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (jobId) {
      const websocket = new WebSocket('ws://localhost:3000');
      
      websocket.onopen = () => {
        console.log('WebSocket connected');
        websocket.send(JSON.stringify({ type: 'subscribe', jobId }));
      };
      
      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        if (data.jobId === jobId) {
          setJob(data);
        }
      };
      
      websocket.onclose = () => {
        console.log('WebSocket disconnected');
      };
      
      setWs(websocket);
      
      // Also poll for job status every 3 seconds as backup
      const pollInterval = setInterval(() => {
        fetchJobStatus(jobId);
      }, 3000);
      
      return () => {
        websocket.close();
        clearInterval(pollInterval);
      };
    }
  }, [jobId]);

  // Fetch job status
  const fetchJobStatus = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/jobs/${id}/status`);
      if (response.ok) {
        const jobData = await response.json();
        console.log('Job status updated:', jobData);
        setJob(jobData);
      } else {
        console.error('Failed to fetch job status:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch job status:', error);
    }
  };

  // Download file
  const downloadFile = async (type: 'karaoke' | 'instrumental' | 'lyrics') => {
    if (!jobId) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/jobs/${jobId}/download/${type}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${type}.${type === 'lyrics' ? 'txt' : 'mp3'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
    }
  };

  // Fetch lyrics content for karaoke player
  const fetchLyricsContent = async () => {
    if (!jobId) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/jobs/${jobId}/download/lyrics`);
      if (response.ok) {
        const text = await response.text();
        setLyricsContent(text);
        return text;
      }
    } catch (error) {
      console.error('Failed to fetch lyrics:', error);
    }
    return '';
  };

  // Open karaoke player
  const openKaraokePlayer = async () => {
    const lyrics = await fetchLyricsContent();
    if (lyrics) {
      setShowKaraoke(true);
    } else {
      alert('Failed to load lyrics for karaoke player');
    }
  };

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
          fetchJobStatus(result.jobId);
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

  // If karaoke player is open, show it instead of main interface
  if (showKaraoke && jobId) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowKaraoke(false)}
          className="absolute top-4 left-4 z-10 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full transition-colors"
        >
          ← Back to Main
        </button>
        <KaraokePlayer
          instrumentalUrl={`http://localhost:3000/api/jobs/${jobId}/preview/instrumental`}
          lyricsText={lyricsContent}
          songTitle={file?.name?.replace('.mp3', '') || 'Karaoke Song'}
        />
      </div>
    );
  }

  // Main interface
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

                  {job && (
                    <div className="p-4 bg-blue-50 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-blue-700">
                          Job Status: {job.status}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => fetchJobStatus(jobId!)}
                            className="text-xs px-2 py-1 bg-blue-200 hover:bg-blue-300 rounded"
                          >
                            🔄 Refresh
                          </button>
                          <span className="text-xs text-blue-600">
                            ID: {jobId}
                          </span>
                        </div>
                      </div>
                      
                      {job.status === 'processing' && (
                        <div className="w-full bg-blue-200 rounded-full h-2.5 mb-2">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${job.progress}%` }}
                          ></div>
                        </div>
                      )}
                      
                      <p className="text-xs text-blue-600">
                        {job.status === 'pending' && 'Processing will begin shortly...'}
                        {job.status === 'processing' && `Processing... ${job.progress}%`}
                        {job.status === 'completed' && 'Processing completed successfully!'}
                        {job.status === 'failed' && `Failed: ${job.error || 'Unknown error'}`}
                      </p>
                      
                      {/* Debug info */}
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer">Debug Info</summary>
                        <pre className="text-xs text-gray-600 mt-1 overflow-auto">
                          {JSON.stringify(job, null, 2)}
                        </pre>
                      </details>
                      
                      {job.status === 'completed' && job.results && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-green-700">
                            🎉 Your karaoke files are ready for download!
                          </p>
                          <p className="text-xs text-green-600 mb-3">
                            Output directory: {job.results.processedDir}
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <button
                              onClick={() => downloadFile('karaoke')}
                              className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                            >
                              📥 Download Karaoke
                            </button>
                            <button
                              onClick={() => downloadFile('instrumental')}
                              className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              📥 Download Instrumental
                            </button>
                            <button
                              onClick={() => downloadFile('lyrics')}
                              className="px-3 py-2 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                            >
                              📥 Download Lyrics
                            </button>
                          </div>
                          <div className="mt-4">
                            <button
                              onClick={openKaraokePlayer}
                              className="w-full px-4 py-3 text-sm bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                            >
                              🎤 Open Karaoke Player
                            </button>
                          </div>
                        </div>
                      )}
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