import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import * as vscode from 'vscode';
import { appendCanvasFile, createCanvas, writeCanvas } from './canvas';

export interface ClipItem {
	label: string;
	html: string;
	text: string;
	code?: string;
	language?: string;
}

export type StackGroup = ClipItem[];

export interface CodeLink {
	repo: string;
	filePath: string;
	line: number;
	fallback: boolean;
}

export type CodeLinkLocation = 'beside' | 'current';

export function codeLinkColumn(
	location: CodeLinkLocation,
	remembered?: vscode.ViewColumn,
	leftColumn?: vscode.ViewColumn,
): vscode.ViewColumn | undefined {
	if (location === 'current') {
		return undefined;
	}
	return remembered ?? leftColumn ?? vscode.ViewColumn.Beside;
}

export function parseCodeLink(uri: vscode.Uri): CodeLink {
	if (uri.path !== '/open') {
		throw new Error('Unsupported code link');
	}
	const query = new URLSearchParams(uri.query);
	const repo = query.get('repo')?.trim() ?? '';
	const filePath = query.get('path')?.trim().replace(/\\/g, '/') ?? '';
	const line = Number(query.get('line'));
	if (!repo || !isSafeRelativePath(filePath) || !Number.isInteger(line) || line < 1) {
		throw new Error('Invalid code link');
	}
	return { repo, filePath, line, fallback: query.get('fallback') === '1' };
}

export function findWorkspace(
	folders: readonly vscode.WorkspaceFolder[] | undefined,
	repo: string,
): vscode.WorkspaceFolder | undefined {
	return folders?.find((folder) => folder.name.localeCompare(repo, undefined, {
		sensitivity: 'accent',
	}) === 0);
}

function isSafeRelativePath(filePath: string): boolean {
	if (!filePath || filePath.startsWith('/') || /^[a-zA-Z]:\//.test(filePath)) {
		return false;
	}
	return filePath.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}

export function projectName(workspaceName?: string, documentPath?: string): string {
	const workspace = workspaceName?.trim();
	if (workspace) { return workspace; }
	const parent = documentPath ? path.basename(path.dirname(documentPath)).trim() : '';
	return parent && parent !== '.' ? parent : 'Code Models';
}

export function clearGroups(groups: StackGroup[]): void {
	groups.length = 0;
}

export function appendStackItem(groups: StackGroup[], item: ClipItem, newGroup: boolean): void {
	if (newGroup || groups.length === 0) {
		groups.push([item]);
		return;
	}
	groups[groups.length - 1].push(item);
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

export function queueTooltip(groups: StackGroup[]): string {
	if (groups.length === 0) {
		return 'Clipper stack is empty';
	}
	let itemNumber = 0;
	return groups.map((group) => group.map((item) => {
		itemNumber += 1;
		return `${itemNumber}. ${item.label}`;
	}).join('\n')).join('\n──────── Group ────────\n');
}

export function mergeGroup(group: StackGroup): ClipItem {
	const fragments = group.map((item) => extractFragment(item.html));
	return {
		label: group.map((item) => item.label).join(' / '),
		html: createClipboardHtml(fragments.join('<div style="height:12px"></div>')),
		text: group.map((item) => item.text).join('\r\n\r\n'),
	};
}

export function createClipItem(
	label: string,
	sourceHtml: string,
	sourceText: string,
	language?: string,
): ClipItem {
	const fragment = extractFragment(sourceHtml);
	const safeLabel = escapeHtml(label);
	const labelHtml = '<div style="color:#404040;font-size:13px;margin-bottom:4px;'
		+ `font-family:Segoe UI,sans-serif;">${safeLabel}</div>`;
	return {
		label,
		html: createClipboardHtml(labelHtml + fragment),
		text: `${label}\r\n${sourceText}`,
		code: sourceText,
		language,
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
	private readonly groups: StackGroup[] = [];
	private readonly status: vscode.StatusBarItem;
	private pasteRunning = false;
	private codeViewColumn?: vscode.ViewColumn;

	constructor(private readonly context: vscode.ExtensionContext) {
		this.status = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Left,
			Number.MIN_SAFE_INTEGER,
		);
		this.status.command = 'vscode-clipper.appendObsidianCanvas';
		this.context.subscriptions.push(this.status);
	}

	register(): void {
		this.addCommand('vscode-clipper.stackSelection', () => this.stackSelection(true));
		this.addCommand('vscode-clipper.stackPreviousGroup', () => this.stackSelection(false));
		this.addCommand('vscode-clipper.clipAndPaste', () => this.clipAndPaste());
		this.addCommand('vscode-clipper.clipAndAppendObsidian', () => this.clipAndAppend());
		this.addCommand('vscode-clipper.pasteAll', () => this.pasteAll());
		this.addCommand('vscode-clipper.clearStack', () => this.clearStack());
		this.addCommand('vscode-clipper.appendObsidianCanvas', () => this.appendActiveCanvas());
		this.addCommand('vscode-clipper.exportObsidianCanvas', () => this.exportCanvas());
		this.context.subscriptions.push(vscode.window.registerUriHandler({
			handleUri: (uri) => this.handleUri(uri),
		}));
		this.updateStatus();
		this.status.show();
	}

	private async handleUri(uri: vscode.Uri): Promise<void> {
		try {
			const link = parseCodeLink(uri);
			const folder = findWorkspace(vscode.workspace.workspaceFolders, link.repo);
			if (folder) {
				await this.openCode(folder, link);
				return;
			}
			if (link.fallback) {
				throw new Error(`Workspace not found after switching: ${link.repo}`);
			}
			this.requireWindows();
			const retryUri = uri.with({ query: `${uri.query}&fallback=1` }).toString(true);
			await this.runHelper('focus-vscode', link.repo, retryUri);
		} catch (error) {
			this.showError(error);
		}
	}

	private async openCode(folder: vscode.WorkspaceFolder, link: CodeLink): Promise<void> {
		const target = vscode.Uri.joinPath(folder.uri, ...link.filePath.split('/'));
		try {
			await vscode.workspace.fs.stat(target);
		} catch {
			throw new Error(`Code file not found: ${link.filePath}`);
		}
		const document = await vscode.workspace.openTextDocument(target);
		if (link.line > document.lineCount) {
			throw new Error(`Line ${link.line} is outside ${link.filePath}`);
		}
		const location = vscode.workspace.getConfiguration('vscode-clipper')
			.get<CodeLinkLocation>('codeLinkOpenLocation', 'beside');
		if (!this.hasCodeGroup()) {
			this.codeViewColumn = undefined;
		}
		const leftColumn = this.leftGroupColumn();
		const moveLeft = location === 'beside'
			&& this.codeViewColumn === undefined && leftColumn === undefined;
		const editor = await vscode.window.showTextDocument(document, {
			viewColumn: codeLinkColumn(location, this.codeViewColumn, leftColumn),
			preview: true,
		});
		if (location === 'beside') {
			if (moveLeft) {
				await vscode.commands.executeCommand('workbench.action.moveActiveEditorGroupLeft');
			}
			this.codeViewColumn = vscode.window.tabGroups.activeTabGroup.viewColumn
				?? editor.viewColumn;
		}
		const position = new vscode.Position(link.line - 1, 0);
		editor.selection = new vscode.Selection(position, position);
		editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
	}

	private hasCodeGroup(): boolean {
		if (this.codeViewColumn === undefined) {
			return false;
		}
		return vscode.window.tabGroups.all.some(
			(group) => group.viewColumn === this.codeViewColumn,
		);
	}

	private leftGroupColumn(): vscode.ViewColumn | undefined {
		const activeColumn = vscode.window.tabGroups.activeTabGroup.viewColumn;
		if (activeColumn === undefined) {
			return undefined;
		}
		return vscode.window.tabGroups.all
			.map((group) => group.viewColumn)
			.filter((column): column is vscode.ViewColumn => column !== undefined
				&& column < activeColumn)
			.sort((left, right) => right - left)[0];
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

	private async stackSelection(newGroup: boolean): Promise<void> {
		if (!this.isIdle()) {
			return;
		}
		const item = await this.captureSelection();
		if (!item) {
			return;
		}
		appendStackItem(this.groups, item, newGroup);
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

	private async clipAndAppend(): Promise<void> {
		if (!this.isIdle()) {
			return;
		}
		const item = await this.captureSelection();
		if (!item) {
			return;
		}
		this.pasteRunning = true;
		try {
			const destination = await this.activeCanvasPath();
			await appendCanvasFile(destination, [[item]]);
			void vscode.window.showInformationMessage(`Clipper: Added to ${destination}`);
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
		const pending = this.groups.map((group) => [...group]);
		this.pasteRunning = true;
		try {
			await this.pasteGroups(pending);
			this.groups.length = 0;
			this.updateStatus();
		} finally {
			this.pasteRunning = false;
		}
	}

	private canPaste(): boolean {
		if (!this.isIdle()) {
			return false;
		}
		if (this.groups.length === 0) {
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
		clearGroups(this.groups);
		this.updateStatus();
		void vscode.window.setStatusBarMessage('Clipper: Stack cleared', 2000);
	}

	private async exportCanvas(): Promise<void> {
		if (this.groups.length === 0) {
			void vscode.window.showWarningMessage('Clipper: Stack is empty');
			return;
		}
		const vault = this.configValue('obsidian.vaultPath');
		if (!vault) {
			throw new Error('Obsidian vault path is not configured');
		}
		const workspace = vscode.workspace.workspaceFolders?.[0]?.name;
		const documentPath = vscode.window.activeTextEditor?.document.uri.fsPath;
		const project = projectName(workspace, documentPath);
		const firstLabel = this.groups[0][0].label;
		const destination = await writeCanvas(
			vault, project, firstLabel, createCanvas(this.groups),
		);
		clearGroups(this.groups);
		this.updateStatus();
		void vscode.window.showInformationMessage(`Clipper: Canvas exported to ${destination}`);
	}

	private async appendActiveCanvas(): Promise<void> {
		if (!this.canPaste()) {
			return;
		}
		const pending = this.groups.map((group) => [...group]);
		this.pasteRunning = true;
		try {
			const destination = await this.activeCanvasPath();
			await appendCanvasFile(destination, pending);
			clearGroups(this.groups);
			this.updateStatus();
			void vscode.window.showInformationMessage(`Clipper: Added to ${destination}`);
		} finally {
			this.pasteRunning = false;
		}
	}

	private async activeCanvasPath(): Promise<string> {
		this.requireWindows();
		const destination = (await this.runHelper('active-canvas')).trim();
		if (!destination) {
			throw new Error('Copy Path did not return an active Canvas path');
		}
		return destination;
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
		return createClipItem(label, clipboard.html, clipboard.text, editor.document.languageId);
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

	private async pasteGroups(groups: StackGroup[]): Promise<void> {
		await this.pasteItems(groups.map(mergeGroup));
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

	private runHelper(...args: string[]): Promise<string> {
		const executable = this.configValue('autoHotkeyPath') || 'AutoHotkey64.exe';
		const script = this.context.asAbsolutePath(path.join('helper', 'vscode-clipper.ahk'));
		if (!fs.existsSync(script)) {
			return Promise.reject(new Error('AutoHotkey helper not found'));
		}
		return this.execOutput(executable, [script, ...args]);
	}

	private execOutput(file: string, args: string[]): Promise<string> {
		return new Promise((resolve, reject) => {
			execFile(file, args, (error, stdout) => error ? reject(error) : resolve(stdout));
		});
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
		const itemCount = this.groups.reduce((count, group) => count + group.length, 0);
		this.status.text = `$(layers) Clipper: ${itemCount}`;
		this.status.tooltip = queueTooltip(this.groups);
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
