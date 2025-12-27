interface WebviewOptions {
    code: string;
    language: string;
    startLine: number;
    theme: string;
    windowStyle: string;
    showLineNumbers: boolean;
    padding: number;
    watermark: string;
}

const THEMES: Record<string, { bg: string; gradient: string; text: string; keyword: string; string: string; comment: string; number: string; function: string }> = {
    dracula: {
        bg: '#282a36',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        text: '#f8f8f2',
        keyword: '#ff79c6',
        string: '#f1fa8c',
        comment: '#6272a4',
        number: '#bd93f9',
        function: '#50fa7b'
    },
    monokai: {
        bg: '#272822',
        gradient: 'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
        text: '#f8f8f2',
        keyword: '#f92672',
        string: '#e6db74',
        comment: '#75715e',
        number: '#ae81ff',
        function: '#a6e22e'
    },
    nord: {
        bg: '#2e3440',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 30%, #f093fb 70%, #00d9ff 100%)',
        text: '#d8dee9',
        keyword: '#81a1c1',
        string: '#a3be8c',
        comment: '#616e88',
        number: '#b48ead',
        function: '#88c0d0'
    },
    synthwave: {
        bg: '#241b2f',
        gradient: 'linear-gradient(135deg, #ff0099 0%, #493240 50%, #00d4ff 100%)',
        text: '#f8f8f2',
        keyword: '#ff7edb',
        string: '#f97e72',
        comment: '#848bbd',
        number: '#f97e72',
        function: '#36f9f6'
    },
    'github-dark': {
        bg: '#0d1117',
        gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        text: '#c9d1d9',
        keyword: '#ff7b72',
        string: '#a5d6ff',
        comment: '#8b949e',
        number: '#79c0ff',
        function: '#d2a8ff'
    },
    ocean: {
        bg: '#1b2838',
        gradient: 'linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)',
        text: '#c5c8c6',
        keyword: '#b294bb',
        string: '#b5bd68',
        comment: '#969896',
        number: '#de935f',
        function: '#81a2be'
    },
    sunset: {
        bg: '#1a1a2e',
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        text: '#f8f8f2',
        keyword: '#ff6b6b',
        string: '#ffd93d',
        comment: '#6c757d',
        number: '#ff9f43',
        function: '#2ecc71'
    },
    aurora: {
        bg: '#0f0f23',
        gradient: 'linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)',
        text: '#e8e8e8',
        keyword: '#7fdbff',
        string: '#2ecc40',
        comment: '#666666',
        number: '#01ff70',
        function: '#39cccc'
    },
    midnight: {
        bg: '#191724',
        gradient: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        text: '#e0def4',
        keyword: '#eb6f92',
        string: '#f6c177',
        comment: '#6e6a86',
        number: '#9ccfd8',
        function: '#c4a7e7'
    }
};

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function highlightCode(code: string, _theme: typeof THEMES[string]): string {
    // Use a token-based approach to avoid regex conflicts
    // Use class names instead of inline styles for html2canvas compatibility
    const tokens: { start: number; end: number; type: string }[] = [];

    // Find all tokens first, then apply them
    const patterns: { regex: RegExp; type: string }[] = [
        // Comments first (highest priority)
        { regex: /\/\/.*$/gm, type: 'comment' },
        { regex: /\/\*[\s\S]*?\*\//g, type: 'comment' },
        // Strings
        { regex: /"(?:[^"\\]|\\.)*"/g, type: 'string' },
        { regex: /'(?:[^'\\]|\\.)*'/g, type: 'string' },
        { regex: /`(?:[^`\\]|\\.)*`/g, type: 'string' },
        // Keywords
        { regex: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|true|false|null|undefined|interface|type|extends|implements|public|private|protected|static|readonly)\b/g, type: 'keyword' },
        // Numbers
        { regex: /\b\d+\.?\d*\b/g, type: 'number' },
    ];

    // Collect all matches
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.regex.exec(code)) !== null) {
            // Check if this position is already covered
            const overlaps = tokens.some(t =>
                (match!.index >= t.start && match!.index < t.end) ||
                (match!.index + match![0].length > t.start && match!.index + match![0].length <= t.end)
            );
            if (!overlaps) {
                tokens.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    type: pattern.type
                });
            }
        }
    }

    // Sort tokens by position
    tokens.sort((a, b) => a.start - b.start);

    // Build result using CSS classes
    let result = '';
    let lastEnd = 0;

    for (const token of tokens) {
        // Add text before this token (escaped)
        if (token.start > lastEnd) {
            result += escapeHtml(code.slice(lastEnd, token.start));
        }
        // Add the token with CSS class
        result += `<span class="syntax-${token.type}">${escapeHtml(code.slice(token.start, token.end))}</span>`;
        lastEnd = token.end;
    }

    // Add remaining text
    if (lastEnd < code.length) {
        result += escapeHtml(code.slice(lastEnd));
    }

    return result;
}


export function getWebviewContent(options: WebviewOptions): string {
    const theme = THEMES[options.theme] || THEMES.dracula;
    const lines = options.code.split('\n');

    const codeLines = lines.map((line, index) => {
        const lineNum = options.startLine + index;
        const lineNumHtml = options.showLineNumbers
            ? `<span class="line-number">${lineNum}</span>`
            : '';
        const highlightedLine = highlightCode(line || ' ', theme);
        return `<div class="code-line">${lineNumHtml}<span class="code-content">${highlightedLine}</span></div>`;
    }).join('');

    const windowButtons = options.windowStyle === 'mac'
        ? `<div class="window-buttons">
            <span class="btn red"></span>
            <span class="btn yellow"></span>
            <span class="btn green"></span>
           </div>`
        : options.windowStyle === 'windows'
            ? `<div class="window-buttons windows">
            <span class="btn-win">─</span>
            <span class="btn-win">□</span>
            <span class="btn-win">✕</span>
           </div>`
            : '';

    const watermarkHtml = options.watermark
        ? `<div class="watermark">${escapeHtml(options.watermark)}</div>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Snapshot</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1e1e1e;
            min-height: 100vh;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .toolbar {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .btn-copy {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-save {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            color: white;
        }
        
        .snapshot-container {
            background: ${theme.gradient};
            padding: ${options.padding}px;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            position: relative;
        }
        
        .code-window {
            background: ${theme.bg};
            border-radius: 8px;
            overflow: hidden;
            min-width: 400px;
            max-width: 800px;
        }
        
        .window-header {
            background: rgba(0,0,0,0.3);
            padding: 12px 16px;
            display: flex;
            align-items: center;
        }
        
        .window-buttons {
            display: flex;
            gap: 8px;
        }
        
        .btn {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
        
        .btn.red { background: #ff5f56; }
        .btn.yellow { background: #ffbd2e; }
        .btn.green { background: #27ca40; }
        
        .window-buttons.windows {
            margin-left: auto;
        }
        
        .btn-win {
            width: 30px;
            height: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #999;
            font-size: 12px;
        }
        
        .code-body {
            padding: 16px 20px;
            font-family: 'SF Mono', 'Fira Code', 'Monaco', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.6;
            color: ${theme.text};
            overflow-x: auto;
        }
        
        .code-line {
            display: flex;
            white-space: pre;
        }
        
        .line-number {
            color: #666;
            min-width: 40px;
            text-align: right;
            padding-right: 16px;
            user-select: none;
        }
        
        .code-content {
            flex: 1;
        }
        
        .watermark {
            position: absolute;
            bottom: ${options.padding + 8}px;
            right: ${options.padding + 12}px;
            color: rgba(255,255,255,0.4);
            font-size: 12px;
            font-weight: 500;
        }
        
        .language-badge {
            margin-left: auto;
            background: rgba(255,255,255,0.1);
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            color: #999;
            text-transform: uppercase;
        }
        
        /* Syntax Highlighting Classes */
        .syntax-keyword { color: ${theme.keyword} !important; }
        .syntax-string { color: ${theme.string} !important; }
        .syntax-comment { color: ${theme.comment} !important; }
        .syntax-number { color: ${theme.number} !important; }
        .syntax-function { color: ${theme.function} !important; }
    </style>
</head>
<body>
    <div class="toolbar">
        <button class="btn-copy" onclick="copyToClipboard()">📋 Copy to Clipboard</button>
        <button class="btn-save" onclick="saveImage()">💾 Save as PNG</button>
    </div>
    
    <div class="snapshot-container" id="snapshot">
        <div class="code-window">
            <div class="window-header">
                ${windowButtons}
                <span class="language-badge">${options.language}</span>
            </div>
            <div class="code-body">
                ${codeLines}
            </div>
        </div>
        ${watermarkHtml}
    </div>

    <script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
    <script>
        const vscode = acquireVsCodeApi();
        
        async function getCanvas() {
            const element = document.getElementById('snapshot');
            return await html2canvas(element, {
                backgroundColor: null,
                scale: 2,
                logging: false,
                useCORS: true
            });
        }
        
        async function copyToClipboard() {
            try {
                const canvas = await getCanvas();
                const dataUrl = canvas.toDataURL('image/png');
                // Send to extension for clipboard handling
                vscode.postMessage({ command: 'copy', dataUrl });
            } catch (err) {
                console.error('Failed to copy:', err);
                vscode.postMessage({ command: 'error', message: 'Failed to capture image' });
            }
        }
        
        async function saveImage() {
            try {
                const canvas = await getCanvas();
                const dataUrl = canvas.toDataURL('image/png');
                vscode.postMessage({ command: 'save', dataUrl });
            } catch (err) {
                console.error('Failed to save:', err);
                vscode.postMessage({ command: 'error', message: 'Failed to save image' });
            }
        }
    </script>
</body>
</html>`;
}
