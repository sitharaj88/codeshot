import * as vscode from 'vscode';
import { SnapshotPanel } from './snapshot-panel';

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeShot is now active! 📸');

    const captureCommand = vscode.commands.registerCommand('codeshot.capture', () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showWarningMessage('No active editor found!');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (!selectedText) {
            vscode.window.showWarningMessage('Please select some code first!');
            return;
        }

        // Get language for syntax highlighting
        const language = editor.document.languageId;

        // Get starting line number
        const startLine = selection.start.line + 1;

        // Open the snapshot panel
        SnapshotPanel.createOrShow(context.extensionUri, {
            code: selectedText,
            language: language,
            startLine: startLine
        });
    });

    context.subscriptions.push(captureCommand);
}

export function deactivate() { }
