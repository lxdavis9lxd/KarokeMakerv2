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
        // Match format: [mm:ss.ss] word
        const match = line.match(/\[(\d{2}):(\d{2}\.\d{2})\]\s+(.+)/);
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseFloat(match[2]);
          const word = match[3].trim();
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

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
    const linesPerScreen = 8;
    const wordsPerLine = 6;
    const lines: LyricWord[][] = [];
    
    for (let i = 0; i < lyrics.length; i += wordsPerLine) {
      lines.push(lyrics.slice(i, i + wordsPerLine));
    }

    // Find which line contains the current word
    const currentLineIndex = Math.floor(currentWordIndex / wordsPerLine);
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
          preload="metadata"
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