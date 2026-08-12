import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
	appendStackItem,
	clearGroups,
	createClipItem,
	formatPath,
	mergeGroup,
	projectName,
	queueTooltip,
	removePastedItems,
	selectedLines,
	type StackGroup,
} from '../extension';
import {
	canvasName,
	createCanvas,
	fencedCode,
	nodeHeight,
	nodeWidth,
	safeDirectory,
	writeCanvas,
} from '../canvas';

suite('Clipper helpers', () => {
	test('formats one line and a line range', () => {
		assert.strictEqual(formatPath('src/runner.ts', 4, 4), 'src/runner.ts : [4]');
		assert.strictEqual(formatPath('src/runner.ts', 4, 8), 'src/runner.ts : [4-8]');
	});

	test('converts selection lines to one-based values', () => {
		const selection = new vscode.Selection(2, 3, 4, 5);
		assert.deepStrictEqual(selectedLines(selection), [3, 5]);
	});

	test('excludes an unselected final line', () => {
		const selection = new vscode.Selection(2, 3, 5, 0);
		assert.deepStrictEqual(selectedLines(selection), [3, 5]);
	});

	test('shows workspace and line numbers by default', () => {
		const config = vscode.workspace.getConfiguration('vscode-clipper');
		assert.strictEqual(config.get('includeLineNumbers'), true);
		assert.strictEqual(config.get('includeWorkspaceFolder'), true);
		assert.strictEqual(config.has('obsidian.canvasDirectory'), false);
	});

	test('chooses a project directory without requiring a workspace', () => {
		assert.strictEqual(projectName(' vscode-clipper ', '/tmp/other/file.ts'), 'vscode-clipper');
		assert.strictEqual(projectName(undefined, '/projects/sample/file.ts'), 'sample');
		assert.strictEqual(projectName(), 'Code Models');
	});

	test('creates UTF-8 clipboard HTML with an escaped label', () => {
		const source = 'Version:1.0\r\n<html><!--StartFragment--><b>コード</b><!--EndFragment--></html>';
		const item = createClipItem('src/a&b.ts : [1]', source, 'コード');
		assert.ok(item.html.includes('src/a&amp;b.ts : [1]'));
		assert.ok(item.html.includes('<b>コード</b>'));
		assert.strictEqual(item.text, 'src/a&b.ts : [1]\r\nコード');
		assertClipboardOffsets(item.html);
	});

	test('shows queued labels in FIFO order', () => {
		const items = [
			{ label: 'first', html: '', text: '' },
			{ label: 'second', html: '', text: '' },
		];
		assert.strictEqual(queueTooltip([items]), '1. first\n2. second');
		assert.strictEqual(queueTooltip([]), 'Clipper stack is empty');
	});

	test('starts a new group for a normal stack capture', () => {
		const first = { label: 'first', html: '', text: '' };
		const second = { label: 'second', html: '', text: '' };
		const groups = [[first]];
		appendStackItem(groups, second, true);
		assert.deepStrictEqual(groups, [[first], [second]]);
		assert.strictEqual(queueTooltip(groups),
			'1. first\n──────── Group ────────\n2. second');
	});

	test('adds a capture to the previous group', () => {
		const first = { label: 'first', html: '', text: '' };
		const second = { label: 'second', html: '', text: '' };
		const groups: StackGroup[] = [[first]];
		appendStackItem(groups, second, false);
		assert.deepStrictEqual(groups, [[first, second]]);
	});

	test('creates the first group when appending to an empty stack', () => {
		const first = { label: 'first', html: '', text: '' };
		const groups: StackGroup[] = [];
		appendStackItem(groups, first, false);
		assert.deepStrictEqual(groups, [[first]]);
	});

	test('clears all groups after a successful operation', () => {
		const groups: StackGroup[] = [[{ label: 'first', html: '', text: '' }]];
		clearGroups(groups);
		assert.deepStrictEqual(groups, []);
	});

	test('merges a group into one rich clipboard object', () => {
		const source = 'Version:1.0\r\n<html><!--StartFragment--><b>x</b><!--EndFragment--></html>';
		const first = createClipItem('first', source, 'x');
		const second = createClipItem('second', source, 'y');
		const merged = mergeGroup([first, second]);
		assert.ok(merged.html.includes('first'));
		assert.ok(merged.html.includes('second'));
		assert.strictEqual(merged.text, `${first.text}\r\n\r\n${second.text}`);
		assertClipboardOffsets(merged.html,
			'<div style="color:#404040;font-size:13px;margin-bottom:4px;'
			+ 'font-family:Segoe UI,sans-serif;">first</div><b>x</b>'
			+ '<div style="height:12px"></div>'
			+ '<div style="color:#404040;font-size:13px;margin-bottom:4px;'
			+ 'font-family:Segoe UI,sans-serif;">second</div><b>x</b>');
	});

	test('removes only the pasted FIFO snapshot', () => {
		const first = { label: 'first', html: '', text: '' };
		const second = { label: 'second', html: '', text: '' };
		const addedLater = { label: 'later', html: '', text: '' };
		const items = [first, second, addedLater];
		removePastedItems(items, [first, second]);
		assert.deepStrictEqual(items, [addedLater]);
	});

	test('keeps the stack when its FIFO snapshot no longer matches', () => {
		const first = { label: 'first', html: '', text: '' };
		const replacement = { label: 'replacement', html: '', text: '' };
		const items = [replacement];
		removePastedItems(items, [first]);
		assert.deepStrictEqual(items, [replacement]);
	});

	test('creates grouped Canvas nodes without edges or overlap', () => {
		const item = (code: string, language = 'typescript') => ({
			label: 'item', html: '', text: code, code, language,
		});
		let id = 0;
		const canvas = createCanvas([
			[item('a'), item('b'), item('c'), item('d'), item('e')],
			[item('日本語\n'.repeat(21), 'python')],
		], () => String(++id));
		assert.deepStrictEqual(canvas.edges, []);
		assert.strictEqual(canvas.nodes.filter((node) => node.type === 'group').length, 2);
		assert.strictEqual(canvas.nodes.filter((node) => node.type === 'text').length, 6);
		const firstText = canvas.nodes.find((node) => node.type === 'text');
		assert.strictEqual(firstText?.text, 'item\n\n```typescript\na\n```');
		const firstRow = canvas.nodes.filter((node) => node.type === 'text' && node.y === firstText?.y);
		assert.ok(firstRow.every((node, index) => index === 0
			|| firstRow[index - 1].x + firstRow[index - 1].width < node.x));
		const groups = canvas.nodes.filter((node) => node.type === 'group');
		assert.ok(groups.every((group) => group.label === ''));
		assert.ok(groups[0].y + groups[0].height < groups[1].y);
	});

	test('omits group frames when every group contains one item', () => {
		const item = (label: string) => ({ label, html: '', text: label, code: label });
		const canvas = createCanvas([[item('a')], [item('b')], [item('c')]]);
		assert.strictEqual(canvas.nodes.filter((node) => node.type === 'group').length, 0);
		assert.strictEqual(canvas.nodes.filter((node) => node.type === 'text').length, 3);
		assert.strictEqual(new Set(canvas.nodes.map((node) => node.y)).size, 2);
	});

	test('uses safe Markdown fences and content-based dimensions', () => {
		assert.strictEqual(fencedCode('const x = 1;', 'typescript'),
			'```typescript\nconst x = 1;\n```');
		assert.strictEqual(fencedCode('```\ncode', 'bad language'), '````\n```\ncode\n````');
		assert.strictEqual(nodeHeight('x'), 88);
		assert.strictEqual(nodeHeight('x', 400, 'src/a.ts : [1]'), 112);
		assert.strictEqual(nodeHeight('x\n'.repeat(40)), 1208);
		assert.strictEqual(nodeHeight('x'.repeat(200), 400), 200);
		assert.strictEqual(nodeHeight('x', 400, 'path/'.repeat(30)), 184);
		assert.strictEqual(nodeWidth('short'), 400);
		assert.strictEqual(nodeWidth('x'.repeat(80)), 800);
		assert.strictEqual(nodeWidth('x'.repeat(200)), 1200);
		assert.strictEqual(nodeWidth('日本語'.repeat(20)), 1160);
	});

	test('writes Canvas files without overwriting an existing name', async () => {
		const vault = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'clipper-vault-'));
		try {
			const canvas = createCanvas([[{ label: 'x', html: '', text: 'x', code: 'x' }]]);
			const first = await writeCanvas(vault, 'project', 'src/user.ts : [1-5]', canvas);
			const second = await writeCanvas(vault, 'project', 'src/user.ts : [1-5]', canvas);
			assert.notStrictEqual(first, second);
			assert.strictEqual(path.basename(first), 'user.canvas');
			assert.strictEqual(path.basename(second), 'user-2.canvas');
			assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(first, 'utf8')), canvas);
		} finally {
			await fs.promises.rm(vault, { recursive: true, force: true });
		}
	});

	test('uses the first source file stem as the Canvas name', () => {
		assert.strictEqual(canvasName('workspace/src/user.service.ts : [20-45]'), 'user.service');
		assert.strictEqual(canvasName('src\\日本語.ts : [1]'), '日本語');
	});

	test('creates a safe Canvas directory from the workspace name', () => {
		assert.strictEqual(safeDirectory('vscode-clipper'), 'vscode-clipper');
		assert.strictEqual(safeDirectory('project/name:*'), 'project-name--');
		assert.throws(() => safeDirectory('..'));
	});
});

function assertClipboardOffsets(
	html: string,
	expected = '<div style="color:#404040;font-size:13px;margin-bottom:4px;'
		+ 'font-family:Segoe UI,sans-serif;">src/a&amp;b.ts : [1]</div><b>コード</b>',
): void {
	const value = (name: string): number => Number(html.match(new RegExp(`${name}:(\\d+)`))?.[1]);
	const bytes = Buffer.from(html, 'utf8');
	assert.strictEqual(bytes.subarray(value('StartHTML'), value('StartHTML') + 6).toString(), '<html>');
	assert.strictEqual(bytes.subarray(value('StartFragment'), value('EndFragment')).toString(),
		expected);
	assert.strictEqual(value('EndHTML'), bytes.length);
}
