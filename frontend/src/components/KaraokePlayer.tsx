import React, { useState, useRef, useEffect } from 'react';
import './KaraokePlayer.css';

interface LyricWord {
  time: number;
  word: string;
}

interface KaraokePlayerProps {
  instrumentalUrl: string;
  lyricsText: string;
  songTitle?: string;
}

const KaraokePlayer: React.FC<KaraokePlayerProps> = ({ 
  instrumentalUrl, 
  lyricsText, 
  songTitle = "Karaoke Song" 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lyrics, setLyrics] = useState<LyricWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  // Parse lyrics from the timestamped format
  useEffect(() => {
    const parseLyrics = (lyricsText: string): LyricWord[] => {
      const lines = lyricsText.split('\n');
      const parsedLyrics: LyricWord[] = [];

      lines.forEach(line => {
        // Match segment-level timestamps: [mm:ss.ss] text
        const segmentMatch = line.match(/^(\[(\d{2}):(\d{2}\.\d{2})\])\s+(.+)$/);
        // Match word-level timestamps: ____[mm:ss.ss] word (indented)
        const wordMatch = line.match(/^\s+(\[(\d{2}):(\d{2}\.\d{2})\])\s+(.+)$/);
        
        if (segmentMatch && !line.startsWith('    ')) {
          // This is a segment-level timestamp - treat as a phrase
          const minutes = parseInt(segmentMatch[2]);
          const seconds = parseFloat(segmentMatch[3]);
          const text = segmentMatch[4].trim();
          const timeInSeconds = minutes * 60 + seconds;
          
          parsedLyrics.push({
            time: timeInSeconds,
            word: text
          });
        } else if (wordMatch) {
          // This is a word-level timestamp (indented)
          const minutes = parseInt(wordMatch[2]);
          const seconds = parseFloat(wordMatch[3]);
          const word = wordMatch[4].trim();
          const timeInSeconds = minutes * 60 + seconds;
          
          parsedLyrics.push({
            time: timeInSeconds,
            word: word
          });
        }
      });

      return parsedLyrics.sort((a, b) => a.time - b.time);
    };

    setLyrics(parseLyrics(lyricsText));
  }, [lyricsText]);

  // Update current time and find current word
  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        
        // Find the current word being sung
        let wordIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
          if (lyrics[i].time <= audioRef.current.currentTime) {
            wordIndex = i;
          } else {
            break;
          }
        }
        setCurrentWordIndex(wordIndex);
      }
    };

    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
      };
    }
  }, [lyrics]);

  // Debug audio loading
  useEffect(() => {
    if (audioRef.current && instrumentalUrl) {
      const audio = audioRef.current;
      console.log('Setting up audio debugging for URL:', instrumentalUrl);
      
      const handleLoadedData = () => {
        console.log('Audio loaded successfully');
        console.log('Duration:', audio.duration);
        console.log('Ready state:', audio.readyState);
      };
      
      const handleError = (e: any) => {
        console.error('Audio error event:', e);
        console.error('Audio error code:', audio.error?.code);
        console.error('Audio error message:', audio.error?.message);
      };
      
      audio.addEventListener('loadeddata', handleLoadedData);
      audio.addEventListener('error', handleError);
      
      return () => {
        audio.removeEventListener('loadeddata', handleLoadedData);
        audio.removeEventListener('error', handleError);
      };
    }
  }, [instrumentalUrl]);

  const togglePlayPause = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          // Make sure the audio is loaded
          if (audioRef.current.readyState < 2) {
            await audioRef.current.load();
          }
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Audio playback error:', error);
        setIsPlaying(false);
        alert('Unable to play audio. Please check if the audio file is accessible.');
      }
    } else {
      console.error('Audio ref is not available');
      alert('Audio player not initialized properly');
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Group lyrics into lines for better display
  const getLyricsDisplay = () => {
    const linesPerScreen = 6;
    const lines: LyricWord[][] = [];
    let currentLine: LyricWord[] = [];
    let currentLineLength = 0;
    const maxLineLength = 80; // Characters per line
    
    lyrics.forEach((lyricWord) => {
      const wordLength = lyricWord.word.length;
      
      // If adding this word would exceed line length, start a new line
      if (currentLineLength + wordLength > maxLineLength && currentLine.length > 0) {
        lines.push([...currentLine]);
        currentLine = [lyricWord];
        currentLineLength = wordLength;
      } else {
        currentLine.push(lyricWord);
        currentLineLength += wordLength + 1; // +1 for space
      }
    });
    
    // Add the last line if it has content
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // Find which line contains the current word
    let currentLineIndex = 0;
    let wordCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (wordCount + lines[i].length > currentWordIndex) {
        currentLineIndex = i;
        break;
      }
      wordCount += lines[i].length;
    }

    const startLine = Math.max(0, currentLineIndex - Math.floor(linesPerScreen / 2));
    const endLine = Math.min(lines.length, startLine + linesPerScreen);

    return lines.slice(startLine, endLine);
  };

  return (
    <div className="karaoke-player bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="text-center py-6 bg-black bg-opacity-30">
        <h1 className="text-4xl font-bold mb-2">🎤 Karaoke Player</h1>
        <h2 className="text-xl text-purple-200">{songTitle}</h2>
      </div>

      {/* Lyrics Display */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="lyrics-container text-center max-w-4xl">
          {getLyricsDisplay().map((line, lineIndex) => (
            <div key={lineIndex} className="lyrics-line mb-6">
              {line.map((lyricWord, wordIndex) => {
                const globalWordIndex = lyrics.findIndex(w => w === lyricWord);
                const isActive = globalWordIndex === currentWordIndex;
                const isPassed = globalWordIndex < currentWordIndex;
                const isUpcoming = globalWordIndex > currentWordIndex;

                return (
                  <span
                    key={wordIndex}
                    className={`lyrics-word text-3xl md:text-4xl font-bold mx-2 py-1 px-2 rounded transition-all duration-300 ${
                      isActive 
                        ? 'bg-yellow-400 text-black shadow-lg scale-110 karaoke-glow' 
                        : isPassed
                        ? 'text-green-300 opacity-80'
                        : isUpcoming
                        ? 'text-white opacity-60'
                        : 'text-gray-400'
                    }`}
                  >
                    {lyricWord.word}
                  </span>
                );
              })}
            </div>
          ))}
          
          {lyrics.length === 0 && (
            <div className="text-2xl text-gray-400">
              🎵 Instrumental playing... No lyrics available 🎵
            </div>
          )}
        </div>
      </div>

      {/* Audio Controls */}
      <div className="controls bg-black bg-opacity-50 p-6">
        <audio
          ref={audioRef}
          src={instrumentalUrl}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error('Audio loading error:', e);
            console.error('Audio URL:', instrumentalUrl);
            alert(`Audio failed to load. URL: ${instrumentalUrl}`);
          }}
          onLoadStart={() => console.log('Audio loading started')}
          onCanPlay={() => console.log('Audio can start playing')}
          onLoadedData={() => console.log('Audio data loaded')}
          preload="metadata"
          crossOrigin="anonymous"
        />

        {/* Progress Bar */}
        <div className="mb-4">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-sm text-gray-300 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, currentTime - 10);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors"
          >
            ⏪ -10s
          </button>
          
          <button
            onClick={togglePlayPause}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full text-xl transition-colors"
          >
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
          
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.min(duration, currentTime + 10);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors"
          >
            ⏩ +10s
          </button>
        </div>

        {/* Progress Info */}
        <div className="text-center mt-4 text-sm text-gray-300">
          {currentWordIndex >= 0 && currentWordIndex < lyrics.length && (
            <div>
              Now: <span className="text-yellow-400 font-bold">{lyrics[currentWordIndex].word}</span>
              {currentWordIndex + 1 < lyrics.length && (
                <span> | Next: <span className="text-blue-300">{lyrics[currentWordIndex + 1].word}</span></span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KaraokePlayer;