// Test lyrics parsing logic
const lyricsText = `# Karaoke Lyrics - a9181965-179e-4653-80ba-093f395e9c36.mp3

## Readable Lyrics
Oh

I didn't mean it when I said I did love you so I should have held on tell I never should have let you go

## Timestamped Lyrics (Karaoke Format)
[00:11.38] Oh
    [00:11.38] Oh

[00:21.46] I didn't mean it when I said I did love you so I should have held on tell I never should have let you go
    [00:21.46] I
    [00:21.98] didn't
    [00:22.50] mean
    [00:22.74] it
    [00:22.88] when
    [00:23.14] I
    [00:23.28] said
    [00:23.52] I
    [00:23.86] did
    [00:24.04] love
    [00:24.44] you
    [00:24.56] so
    [00:24.90] I
    [00:25.44] should
    [00:25.74] have
    [00:25.94] held
    [00:26.20] on
    [00:26.46] tell
    [00:26.56] I
    [00:26.70] never
    [00:27.06] should
    [00:27.40] have
    [00:27.58] let
    [00:27.84] you
    [00:27.98] go

## Processing Information
- Language Detected: en
`;

function parseLyrics(lyricsText) {
    console.log('🎵 Parsing lyrics text:', lyricsText.length, 'characters');
    console.log('🎵 First 500 chars:', lyricsText.substring(0, 500));
    const lines = lyricsText.split('\n');
    const parsedLyrics = [];

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
}

// Test the parsing
const result = parseLyrics(lyricsText);
console.log('Final result:', result);