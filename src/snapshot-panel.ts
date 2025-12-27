import * as vscode from 'vscode';
import { getWebviewContent } from './webview-content';

interface SnapshotData {
    code: string;
    language: string;
    startLine: number;
}

export class SnapshotPanel {
    public static currentPanel: SnapshotPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, data: SnapshotData) {
        const column = vscode.ViewColumn.Beside;

        if (SnapshotPanel.currentPanel) {
            SnapshotPanel.currentPanel._panel.reveal(column);
            SnapshotPanel.currentPanel._update(data);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'codeSnapshot',
            '📸 Code Snapshot',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [extensionUri]
            }
        );

        SnapshotPanel.currentPanel = new SnapshotPanel(panel, extensionUri, data);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, data: SnapshotData) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        this._update(data);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'copy':
                        this._copyToClipboard(message.dataUrl);
                        return;
                    case 'save':
                        this._saveImage(message.dataUrl);
                        return;
                    case 'error':
                        vscode.window.showErrorMessage(message.message);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async _copyToClipboard(dataUrl: string) {
        try {
            // Save to temp file and notify user
            const os = require('os');
            const path = require('path');
            const tempPath = path.join(os.tmpdir(), `codeshot-${Date.now()}.png`);
            const tempUri = vscode.Uri.file(tempPath);

            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            await vscode.workspace.fs.writeFile(tempUri, buffer);

            // Open the file so user can copy from there
            vscode.env.openExternal(tempUri);
            vscode.window.showInformationMessage('📸 Image saved! You can copy it from the opened file.');
        } catch (err) {
            vscode.window.showErrorMessage('Failed to copy to clipboard');
        }
    }

    private async _saveImage(dataUrl: string) {
        const uri = await vscode.window.showSaveDialog({
            filters: { 'PNG Image': ['png'] },
            defaultUri: vscode.Uri.file('code-snapshot.png')
        });

        if (uri) {
            const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            await vscode.workspace.fs.writeFile(uri, buffer);
            vscode.window.showInformationMessage(`💾 Saved to ${uri.fsPath}`);
        }
    }

    private _update(data: SnapshotData) {
        const config = vscode.workspace.getConfiguration('codeshot');

        this._panel.webview.html = getWebviewContent({
            code: data.code,
            language: data.language,
            startLine: data.startLine,
            theme: config.get('theme', 'dracula'),
            windowStyle: config.get('windowStyle', 'mac'),
            showLineNumbers: config.get('showLineNumbers', true),
            padding: config.get('padding', 32),
            watermark: config.get('watermark', '')
        });
    }

    public dispose() {
        SnapshotPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) d.dispose();
        }
    }
}
