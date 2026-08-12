import * as assert from 'assert';
import * as vscode from 'vscode';
import {
	appendStackItem,
	createClipItem,
	formatPath,
	mergeGroup,
	queueTooltip,
	removePastedItems,
	selectedLines,
	type StackGroup,
} from '../extension';

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
