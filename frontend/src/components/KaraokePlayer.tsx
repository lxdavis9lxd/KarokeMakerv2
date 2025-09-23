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
      console.log('🎵 Parsing lyrics text:', lyricsText.length, 'characters');
      console.log('🎵 First 500 chars:', lyricsText.substring(0, 500));
      const lines = lyricsText.split('\n');
      const parsedLyrics: LyricWord[] = [];

      // Find the start of the timestamped section
      let inTimestampedSection = false;
      
      lines.forEach((line, index) => {
        // Check if we've reached the timestamped section
        if (line.includes('## Timestamped Lyrics (Karaoke Format)')) {
          inTimestampedSection = true;
          console.log('📍 Found timestamped section at line', index);
          return;
        }
        
        // Skip lines before the timestamped section
        if (!inTimestampedSection) {
          return;
        }
        
        // Stop if we reach another section
        if (line.startsWith('## ') && !line.includes('## Timestamped Lyrics')) {
          console.log('📍 Reached end of timestamped section at line', index);
          return;
        }
        
        // Debug: log lines we're checking
        if (inTimestampedSection && line.trim()) {
          console.log(`🔍 Line ${index}: "${line}"`);
          console.log(`🔍 Starts with 4+ spaces: ${/^\s{4,}/.test(line)}`);
          console.log(`🔍 Contains timestamp: ${/\[\d{1,2}:\d{2}\.\d{2}\]/.test(line)}`);
        }
        
        // Only parse word-level timestamps (indented with 4+ spaces)
        // This gives us the best granularity for karaoke
        const wordMatch = line.match(/^\s{4,}\[(\d{1,2}):(\d{2}\.\d{2})\]\s+(.+)$/);
        
        if (wordMatch) {
          const minutes = parseInt(wordMatch[1]);
          const seconds = parseFloat(wordMatch[2]);
          const word = wordMatch[3].trim();
          const timeInSeconds = minutes * 60 + seconds;
          
          // Skip empty words or timing markers
          if (word && word.length > 0) {
            console.log(`🎤 Word at ${timeInSeconds.toFixed(2)}s: "${word}"`);
            parsedLyrics.push({
              time: timeInSeconds,
              word: word
            });
          }
        }
      });

      console.log('🎵 Total parsed lyrics:', parsedLyrics.length);
      return parsedLyrics.sort((a, b) => a.time - b.time);
    };

    const parsed = parseLyrics(lyricsText);
    console.log('Setting lyrics state with', parsed.length, 'items');
    setLyrics(parsed);
  }, [lyricsText]);

  // Update current time and find current word
  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current) {
        const currentAudioTime = audioRef.current.currentTime;
        setCurrentTime(currentAudioTime);
        
        // Find the current word being sung with better timing
        let wordIndex = -1;
        const lookAheadTime = 0.2; // 200ms look-ahead for better sync
        
        for (let i = 0; i < lyrics.length; i++) {
          // A word is "current" if we're within its time window
          const wordTime = lyrics[i].time;
          const nextWordTime = i + 1 < lyrics.length ? lyrics[i + 1].time : wordTime + 2;
          
          if (currentAudioTime >= wordTime - lookAheadTime && 
              currentAudioTime < nextWordTime - lookAheadTime) {
            wordIndex = i;
            break;
          } else if (currentAudioTime >= wordTime - lookAheadTime) {
            wordIndex = i; // Keep track of the last word we've passed
          }
        }
        
        if (wordIndex !== currentWordIndex) {
          console.log(`🎤 Word change: ${currentWordIndex} -> ${wordIndex} at ${currentAudioTime.toFixed(2)}s`);
          if (wordIndex >= 0 && lyrics[wordIndex]) {
            console.log(`🎵 Now playing: "${lyrics[wordIndex].word}"`);
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
        console.log('🎵 Audio loaded, duration:', audio.duration);
      });

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
      };
    }
  }, [lyrics, currentWordIndex]);

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
    console.log('🎵 getLyricsDisplay called with lyrics:', lyrics.length, 'currentWordIndex:', currentWordIndex);
    
    if (lyrics.length === 0) {
      return [];
    }
    
    const linesPerScreen = 4;
    const lines: LyricWord[][] = [];
    let currentLine: LyricWord[] = [];
    let currentLineLength = 0;
    const maxLineLength = 60; // Characters per line (shorter for better readability)
    
    lyrics.forEach((lyricWord) => {
      const wordLength = lyricWord.word.length;
      
      // Start a new line if:
      // 1. Adding this word would exceed line length AND we have words in current line
      // 2. This word contains punctuation that suggests end of phrase
      const endsPhrase = /[.!?]$/.test(lyricWord.word);
      const shouldBreakLine = (currentLineLength + wordLength > maxLineLength && currentLine.length > 0) || 
                             (endsPhrase && currentLine.length >= 3);
      
      if (shouldBreakLine) {
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

    console.log('🎵 Created', lines.length, 'lines for display');

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

    // Show lines around the current line for context
    const startLine = Math.max(0, currentLineIndex - Math.floor(linesPerScreen / 2));
    const endLine = Math.min(lines.length, startLine + linesPerScreen);

    const displayLines = lines.slice(startLine, endLine);
    console.log('🎵 Displaying lines', startLine, 'to', endLine, ':', displayLines.length, 'lines');
    
    return displayLines;
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
          {/* Debug Info */}
          <div className="mb-4 text-sm text-gray-300 bg-black bg-opacity-30 p-2 rounded">
            <div>📊 Lyrics: {lyrics.length} words | Current: {currentWordIndex} | Time: {currentTime.toFixed(1)}s</div>
            {currentWordIndex >= 0 && currentWordIndex < lyrics.length && (
              <div>🎤 Playing: "{lyrics[currentWordIndex].word}" | Next: {currentWordIndex + 1 < lyrics.length ? `"${lyrics[currentWordIndex + 1].word}"` : 'End'}</div>
            )}
            <div>🎵 Audio ready: {audioRef.current?.readyState || 0}/4 | Duration: {duration.toFixed(1)}s</div>
          </div>
          
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