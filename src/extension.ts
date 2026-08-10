import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import * as vscode from 'vscode';

export function selectedLines(selection: vscode.Selection): [number, number] {
	const start = selection.start.line + 1;
	const endOffset = selection.end.character === 0 ? -1 : 0;
	return [start, Math.max(start, selection.end.line + 1 + endOffset)];
}

export function formatPath(relativePath: string, start: number, end: number): string {
	const suffix = start === end ? `${start}` : `${start}-${end}`;
	return `${relativePath} : [${suffix}]`;
}

class Clipper {
	constructor(private readonly context: vscode.ExtensionContext) {}

	register(): void {
		this.addCommand('vscode-clipper.clipAndPaste', () => this.clipAndPaste());
	}

	private addCommand(name: string, action: () => Promise<void>): void {
		const command = vscode.commands.registerCommand(name, async () => {
			try {
				await action();
			} catch (error) {
				this.showError(error);
			}
		});
		this.context.subscriptions.push(command);
	}

	private async clipAndPaste(): Promise<void> {
		const editor = this.getEditor();
		if (!editor) {
			return;
		}

		const displayPath = this.getDisplayPath(editor);
		await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
		await new Promise((resolve) => setTimeout(resolve, 150));
		const drawio = this.configValue('drawioExecutable');
		await this.runHelper('paste-return', displayPath, drawio);
	}

	private getEditor(): vscode.TextEditor | undefined {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			void vscode.window.showWarningMessage('Clipper: No active editor');
			return undefined;
		}
		if (editor.selection.isEmpty) {
			void vscode.window.showWarningMessage('Clipper: No code selected');
			return undefined;
		}
		return editor;
	}

	private getDisplayPath(editor: vscode.TextEditor): string {
		const relativePath = this.getRelativePath(editor.document.uri);
		const [startLine, endLine] = selectedLines(editor.selection);
		const includeLines = vscode.workspace.getConfiguration('vscode-clipper')
			.get<boolean>('includeLineNumbers', true);
		return includeLines ? formatPath(relativePath, startLine, endLine) : relativePath;
	}

	private getRelativePath(uri: vscode.Uri): string {
		const config = vscode.workspace.getConfiguration('vscode-clipper');
		const includeFolder = config.get<boolean>('includeWorkspaceFolder', true);
		const relativePath = vscode.workspace.asRelativePath(uri, includeFolder);
		return relativePath.replace(/\\/g, '/');
	}

	private runHelper(...args: string[]): Promise<void> {
		if (process.platform !== 'win32') {
			return Promise.reject(new Error('AutoHotkey integration is available on Windows only'));
		}
		const executable = this.configValue('autoHotkeyPath') || 'AutoHotkey64.exe';
		const script = this.context.asAbsolutePath(path.join('helper', 'vscode-clipper.ahk'));
		if (!fs.existsSync(script)) {
			return Promise.reject(new Error('AutoHotkey helper not found'));
		}
		return new Promise((resolve, reject) => {
			execFile(executable, [script, ...args], (error) => error ? reject(error) : resolve());
		});
	}

	private configValue(name: string): string {
		return vscode.workspace.getConfiguration('vscode-clipper').get<string>(name, '').trim();
	}

	private showError(error: unknown): void {
		const message = error instanceof Error ? error.message : String(error);
		void vscode.window.showErrorMessage(`Clipper: ${message}`);
	}

}

export function activate(context: vscode.ExtensionContext): void {
	new Clipper(context).register();
}

export function deactivate(): void {}
