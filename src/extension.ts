import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import * as vscode from 'vscode';

export interface ClipItem {
	label: string;
	html: string;
	text: string;
}

export function removePastedItems(items: ClipItem[], pasted: readonly ClipItem[]): void {
	if (pasted.every((item, index) => items[index] === item)) {
		items.splice(0, pasted.length);
	}
}

export function selectedLines(selection: vscode.Selection): [number, number] {
	const start = selection.start.line + 1;
	const endOffset = selection.end.character === 0 ? -1 : 0;
	return [start, Math.max(start, selection.end.line + 1 + endOffset)];
}

export function formatPath(relativePath: string, start: number, end: number): string {
	const suffix = start === end ? `${start}` : `${start}-${end}`;
	return `${relativePath} : [${suffix}]`;
}

export function queueTooltip(items: ClipItem[]): string {
	if (items.length === 0) {
		return 'Clipper stack is empty';
	}
	return items.map((item, index) => `${index + 1}. ${item.label}`).join('\n');
}

export function createClipItem(label: string, sourceHtml: string, sourceText: string): ClipItem {
	const fragment = extractFragment(sourceHtml);
	const safeLabel = escapeHtml(label);
	const labelHtml = '<div style="color:#404040;font-size:13px;margin-bottom:4px;'
		+ `font-family:Segoe UI,sans-serif;">${safeLabel}</div>`;
	return {
		label,
		html: createClipboardHtml(labelHtml + fragment),
		text: `${label}\r\n${sourceText}`,
	};
}

function extractFragment(html: string): string {
	const startMarker = '<!--StartFragment-->';
	const endMarker = '<!--EndFragment-->';
	const start = html.indexOf(startMarker);
	const end = html.indexOf(endMarker);
	if (start < 0 || end <= start) {
		throw new Error('VS Code HTML clipboard fragment was not found');
	}
	return html.slice(start + startMarker.length, end);
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function createClipboardHtml(fragment: string): string {
	const prefix = '<html><body><!--StartFragment-->';
	const suffix = '<!--EndFragment--></body></html>';
	const template = 'Version:1.0\r\nStartHTML:{0}\r\nEndHTML:{1}\r\n'
		+ 'StartFragment:{2}\r\nEndFragment:{3}\r\n';
	const emptyHeader = formatHeader(template, 0, 0, 0, 0);
	const startHtml = byteCount(emptyHeader);
	const startFragment = startHtml + byteCount(prefix);
	const endFragment = startFragment + byteCount(fragment);
	const endHtml = startHtml + byteCount(prefix + fragment + suffix);
	return formatHeader(template, startHtml, endHtml, startFragment, endFragment)
		+ prefix + fragment + suffix;
}

function formatHeader(template: string, ...values: number[]): string {
	return values.reduce(
		(result, value, index) => result.replace(`{${index}}`, value.toString().padStart(10, '0')),
		template,
	);
}

function byteCount(value: string): number {
	return Buffer.byteLength(value, 'utf8');
}

class Clipper {
	private readonly items: ClipItem[] = [];
	private readonly status: vscode.StatusBarItem;
	private pasteRunning = false;

	constructor(private readonly context: vscode.ExtensionContext) {
		this.status = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			Number.MIN_SAFE_INTEGER,
		);
		this.status.command = 'vscode-clipper.pasteAll';
		this.context.subscriptions.push(this.status);
	}

	register(): void {
		this.addCommand('vscode-clipper.stackSelection', () => this.stackSelection());
		this.addCommand('vscode-clipper.clipAndPaste', () => this.clipAndPaste());
		this.addCommand('vscode-clipper.pasteAll', () => this.pasteAll());
		this.addCommand('vscode-clipper.clearStack', () => this.clearStack());
		this.updateStatus();
		this.status.show();
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

	private async stackSelection(): Promise<void> {
		if (!this.isIdle()) {
			return;
		}
		const item = await this.captureSelection();
		if (!item) {
			return;
		}
		this.items.push(item);
		this.updateStatus();
	}

	private async clipAndPaste(): Promise<void> {
		if (!this.isIdle()) {
			return;
		}
		const item = await this.captureSelection();
		if (!item) {
			return;
		}
		this.pasteRunning = true;
		try {
			await this.pasteItems([item]);
		} finally {
			this.pasteRunning = false;
		}
	}

	private async pasteAll(): Promise<void> {
		await this.pasteStack();
	}

	private async pasteStack(): Promise<void> {
		if (!this.canPaste()) {
			return;
		}
		const pending = [...this.items];
		this.pasteRunning = true;
		try {
			await this.pasteItems(pending);
			removePastedItems(this.items, pending);
			this.updateStatus();
		} finally {
			this.pasteRunning = false;
		}
	}

	private canPaste(): boolean {
		if (!this.isIdle()) {
			return false;
		}
		if (this.items.length === 0) {
			void vscode.window.showWarningMessage('Clipper: Stack is empty');
			return false;
		}
		return true;
	}

	private isIdle(): boolean {
		if (!this.pasteRunning) {
			return true;
		}
		void vscode.window.showWarningMessage('Clipper: A paste operation is already running');
		return false;
	}

	private async clearStack(): Promise<void> {
		if (this.pasteRunning) {
			void vscode.window.showWarningMessage('Clipper: Cannot clear the stack while pasting');
			return;
		}
		this.items.length = 0;
		this.updateStatus();
		void vscode.window.setStatusBarMessage('Clipper: Stack cleared', 2000);
	}

	private async captureSelection(): Promise<ClipItem | undefined> {
		const editor = this.getEditor();
		if (!editor) {
			return undefined;
		}
		const label = this.getDisplayPath(editor);
		await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
		await new Promise((resolve) => setTimeout(resolve, 150));
		const clipboard = await this.readClipboard();
		return createClipItem(label, clipboard.html, clipboard.text);
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
		return vscode.workspace.asRelativePath(uri, includeFolder).replace(/\\/g, '/');
	}

	private async readClipboard(): Promise<{ html: string; text: string }> {
		this.requireWindows();
		const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vscode-clipper-'));
		try {
			const htmlPath = path.join(tempDir, 'clipboard.html');
			const textPath = path.join(tempDir, 'clipboard.txt');
			await this.runPowerShell('get', htmlPath, textPath);
			const [html, text] = await Promise.all([
				fs.promises.readFile(htmlPath, 'utf8'),
				fs.promises.readFile(textPath, 'utf8'),
			]);
			return { html, text };
		} finally {
			await fs.promises.rm(tempDir, { recursive: true, force: true });
		}
	}

	private async pasteItems(items: ClipItem[]): Promise<void> {
		this.requireWindows();
		const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'vscode-clipper-'));
		try {
			await this.writeItems(tempDir, items);
			const drawio = this.configValue('drawioExecutable');
			await this.runHelper('paste-files', tempDir, String(items.length), drawio);
		} finally {
			await fs.promises.rm(tempDir, { recursive: true, force: true });
		}
	}

	private async writeItems(tempDir: string, items: ClipItem[]): Promise<void> {
		const writes = items.flatMap((item, index) => [
			fs.promises.writeFile(path.join(tempDir, `${index}.html`), item.html, 'utf8'),
			fs.promises.writeFile(path.join(tempDir, `${index}.txt`), item.text, 'utf8'),
		]);
		await Promise.all(writes);
	}

	private runPowerShell(mode: string, htmlPath: string, textPath: string): Promise<void> {
		const script = this.context.asAbsolutePath(path.join('helper', 'clipboard.ps1'));
		return this.exec('powershell.exe', [
			'-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-File', script,
			'-Mode', mode, '-HtmlPath', htmlPath, '-TextPath', textPath,
		]);
	}

	private runHelper(...args: string[]): Promise<void> {
		const executable = this.configValue('autoHotkeyPath') || 'AutoHotkey64.exe';
		const script = this.context.asAbsolutePath(path.join('helper', 'vscode-clipper.ahk'));
		if (!fs.existsSync(script)) {
			return Promise.reject(new Error('AutoHotkey helper not found'));
		}
		return this.exec(executable, [script, ...args]);
	}

	private exec(file: string, args: string[]): Promise<void> {
		return new Promise((resolve, reject) => {
			execFile(file, args, (error) => error ? reject(error) : resolve());
		});
	}

	private requireWindows(): void {
		if (process.platform !== 'win32') {
			throw new Error('AutoHotkey integration is available on Windows only');
		}
	}

	private configValue(name: string): string {
		return vscode.workspace.getConfiguration('vscode-clipper').get<string>(name, '').trim();
	}

	private updateStatus(): void {
		this.status.text = `$(layers) Clipper: ${this.items.length}`;
		this.status.tooltip = queueTooltip(this.items);
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
