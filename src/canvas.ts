import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { StackGroup } from './extension';

interface CanvasNode {
	id: string;
	type: 'text' | 'group';
	x: number;
	y: number;
	width: number;
	height: number;
	text?: string;
	label?: string;
}

export interface CanvasData {
	nodes: CanvasNode[];
	edges: unknown[];
}

const columns = 2;
const horizontalGap = 80;
const verticalGap = 80;
const groupGap = 200;
const groupPadding = 100;
const outerPadding = 12;
const textLineHeight = 24;
const codeLineHeight = 19;
const contentGap = 20;
const codePadding = 8;

export function createCanvas(
	groups: StackGroup[],
	createId: () => string = () => randomUUID(),
): CanvasData {
	if (groups.length > 0 && groups.every((group) => group.length === 1)) {
		const items = groups.flat();
		return { nodes: layoutGroup(items, 0, createId).nodes, edges: [] };
	}
	const nodes: CanvasNode[] = [];
	let groupY = 0;
	groups.forEach((group) => {
		const layout = layoutGroup(group, groupY, createId);
		nodes.push({
			id: createId(), type: 'group', x: 0, y: groupY,
			width: layout.width, height: layout.height, label: '',
		});
		nodes.push(...layout.nodes);
		groupY += layout.height + groupGap;
	});
	return { nodes, edges: [] };
}

function layoutGroup(group: StackGroup, y: number, createId: () => string) {
	const nodes: CanvasNode[] = [];
	let rowY = y + groupPadding;
	let widestRow = 0;
	for (let start = 0; start < group.length; start += columns) {
		const row = group.slice(start, start + columns);
		const widths = row.map((item) => nodeWidth(item.code ?? item.text));
		const heights = row.map((item, index) => nodeHeight(
			item.code ?? item.text, widths[index], item.label,
		));
		let rowX = groupPadding;
		row.forEach((item, column) => {
			nodes.push({
			id: createId(), type: 'text',
			x: rowX, y: rowY, width: widths[column], height: heights[column],
			text: `${item.label}\n\n${fencedCode(item.code ?? item.text, item.language)}`,
			});
			rowX += widths[column] + horizontalGap;
		});
		widestRow = Math.max(widestRow, rowX - horizontalGap - groupPadding);
		rowY += Math.max(...heights) + verticalGap;
	}
	const width = groupPadding * 2 + widestRow;
	const height = rowY - verticalGap - y + groupPadding;
	return { nodes, width, height };
}

export function nodeWidth(code: string): number {
	const longest = Math.max(...code.split(/\r?\n/).map(displayWidth));
	return Math.min(1200, Math.max(400, longest * 9 + 80));
}

function displayWidth(line: string): number {
	let width = 0;
	for (const character of line) {
		if (character === '\t') {
			width += 4 - width % 4;
			continue;
		}
		width += (character.codePointAt(0) ?? 0) > 0xff ? 2 : 1;
	}
	return width;
}

export function nodeHeight(code: string, width = nodeWidth(code), label = ''): number {
	const textCapacity = lineCapacity(width, outerPadding * 2);
	const codeCapacity = lineCapacity(width, outerPadding * 2 + codePadding * 2);
	const labelLines = wrappedLines(label, textCapacity);
	const codeLines = wrappedLines(code, codeCapacity);
	return outerPadding * 2 + labelLines * textLineHeight
		+ contentGap + codeLines * codeLineHeight + codePadding * 2;
}

function lineCapacity(width: number, padding: number): number {
	return Math.max(1, Math.floor((width - padding) / 9));
}

function wrappedLines(text: string, capacity: number): number {
	if (!text) { return 0; }
	return text.split(/\r?\n/).reduce((total, line) =>
		total + Math.max(1, Math.ceil(displayWidth(line) / capacity)), 0);
}

export function fencedCode(code: string, language?: string): string {
	const longest = Math.max(0, ...Array.from(code.matchAll(/`+/g), (match) => match[0].length));
	const fence = '`'.repeat(Math.max(3, longest + 1));
	const safeLanguage = language?.match(/^[\w.+#-]+$/)?.[0] ?? '';
	return `${fence}${safeLanguage}\n${code}\n${fence}`;
}

export async function writeCanvas(
	vault: string,
	project: string,
	firstLabel: string,
	data: CanvasData,
): Promise<string> {
	const vaultPath = path.resolve(vault);
	const stat = await fs.promises.stat(vaultPath).catch(() => undefined);
	if (!stat?.isDirectory()) {
		throw new Error('Obsidian vault path does not exist');
	}
	const outputDir = path.join(vaultPath, safeDirectory(project));
	await fs.promises.mkdir(outputDir, { recursive: true });
	const baseName = canvasName(firstLabel);
	return atomicWrite(outputDir, baseName, JSON.stringify(data, null, 2) + '\n');
}

export function appendCanvas(existing: CanvasData, addition: CanvasData): CanvasData {
	const bottom = existing.nodes.reduce(
		(value, node) => Math.max(value, node.y + node.height),
		Number.NEGATIVE_INFINITY,
	);
	const top = addition.nodes.reduce(
		(value, node) => Math.min(value, node.y),
		Number.POSITIVE_INFINITY,
	);
	const offset = Number.isFinite(bottom) && Number.isFinite(top)
		? bottom + groupGap - top
		: 0;
	const nodes = addition.nodes.map((node) => ({ ...node, y: node.y + offset }));
	return { nodes: [...existing.nodes, ...nodes], edges: [...existing.edges] };
}

export async function appendCanvasFile(destination: string, groups: StackGroup[]): Promise<void> {
	if (path.extname(destination).toLowerCase() !== '.canvas') {
		throw new Error('Active Obsidian file is not a Canvas');
	}
	const source = await fs.promises.readFile(destination, 'utf8');
	const existing = parseCanvas(source);
	const updated = appendCanvas(existing, createCanvas(groups));
	await atomicReplace(destination, JSON.stringify(updated, null, 2) + '\n');
}

function parseCanvas(source: string): CanvasData {
	const data: unknown = JSON.parse(source);
	if (!isRecord(data) || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
		throw new Error('Active Canvas has an invalid JSON structure');
	}
	if (!data.nodes.every(isCanvasNode)) {
		throw new Error('Active Canvas contains an invalid node');
	}
	return { nodes: data.nodes, edges: data.edges };
}

function isCanvasNode(value: unknown): value is CanvasNode {
	if (!isRecord(value)) { return false; }
	return ['x', 'y', 'width', 'height'].every((key) =>
		typeof value[key] === 'number' && Number.isFinite(value[key]));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

export function safeDirectory(project: string): string {
	const safeName = project.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').trim();
	if (!safeName || safeName === '.' || safeName === '..') {
		throw new Error('Workspace name cannot be used as a Canvas directory');
	}
	return safeName;
}

export function canvasName(label: string): string {
	const source = label.replace(/ : \[\d+(?:-\d+)?\]$/, '').replace(/\\/g, '/');
	const fileName = path.posix.basename(source);
	const stem = path.posix.parse(fileName).name;
	const safeName = stem.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').trim();
	if (!safeName) {
		throw new Error('First stack item does not have a usable file name');
	}
	return safeName;
}

async function atomicWrite(directory: string, baseName: string, content: string): Promise<string> {
	const temporary = path.join(directory, `.${baseName}-${randomUUID()}.tmp`);
	await fs.promises.writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
	try {
		for (let suffix = 1; ; suffix += 1) {
			const name = suffix === 1 ? baseName : `${baseName}-${suffix}`;
			const destination = path.join(directory, `${name}.canvas`);
			try {
				await fs.promises.link(temporary, destination);
				return destination;
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'EEXIST') { throw error; }
			}
		}
	} finally {
		await fs.promises.unlink(temporary).catch(() => undefined);
	}
}

async function atomicReplace(destination: string, content: string): Promise<void> {
	const directory = path.dirname(destination);
	const temporary = path.join(directory, `.${path.basename(destination)}-${randomUUID()}.tmp`);
	await fs.promises.writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
	try {
		await fs.promises.rename(temporary, destination);
	} finally {
		await fs.promises.unlink(temporary).catch(() => undefined);
	}
}
