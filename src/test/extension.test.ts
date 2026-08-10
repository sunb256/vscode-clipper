import * as assert from 'assert';
import * as vscode from 'vscode';
import { formatPath, selectedLines } from '../extension';

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
});
