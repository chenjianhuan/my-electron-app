const fs = require('fs');
const path = require('path');

const MessageProcessor = require('../public/messageProcessor.js');

const DATASET_PATH = path.resolve(__dirname, '..', 'docs', '数据集');
const processor = new MessageProcessor();

function isBlockHeading(line) {
    const trimmed = String(line || '').trim();
    if (!trimmed) return false;
    return /^(?:第\s*\d+\s*条?|第[一二三四五六七八九十百]+条?)$/u.test(trimmed);
}

function normalizeHeading(text) {
    return String(text || '').replace(/\s+/g, '').trim();
}

function parseArgs(argv) {
    const args = { block: '', onlyIssues: false };
    argv.forEach((token) => {
        const value = String(token || '').trim();
        if (!value) return;
        if (value === '--only-issues') {
            args.onlyIssues = true;
            return;
        }
        if (value.startsWith('--block=')) {
            args.block = value.slice('--block='.length).trim();
        }
    });
    return args;
}

function splitDatasetBlocks(content) {
    const lines = String(content || '').replace(/\r/g, '').split('\n');
    const blocks = [];
    let current = null;

    lines.forEach((line, index) => {
        const lineNo = index + 1;
        if (isBlockHeading(line)) {
            if (current && current.bodyLines.some(item => String(item.text || '').trim())) {
                blocks.push({
                    heading: current.heading,
                    headingLineNo: current.headingLineNo,
                    body: current.bodyLines.map(item => item.text).join('\n').trim(),
                    startLineNo: current.bodyLines.length > 0 ? current.bodyLines[0].lineNo : current.headingLineNo,
                    endLineNo: current.bodyLines.length > 0 ? current.bodyLines[current.bodyLines.length - 1].lineNo : current.headingLineNo
                });
            }
            current = {
                heading: String(line || '').trim(),
                headingLineNo: lineNo,
                bodyLines: []
            };
            return;
        }
        if (!current) return;
        current.bodyLines.push({ text: String(line || ''), lineNo });
    });

    if (current && current.bodyLines.some(item => String(item.text || '').trim())) {
        blocks.push({
            heading: current.heading,
            headingLineNo: current.headingLineNo,
            body: current.bodyLines.map(item => item.text).join('\n').trim(),
            startLineNo: current.bodyLines.length > 0 ? current.bodyLines[0].lineNo : current.headingLineNo,
            endLineNo: current.bodyLines.length > 0 ? current.bodyLines[current.bodyLines.length - 1].lineNo : current.headingLineNo
        });
    }

    return blocks;
}

function summarizeBlock(block) {
    const preview = processor.previewMessage(block.body, { allowPartial: true });
    if (!preview || !preview.success || !preview.result) {
        return {
            heading: block.heading,
            headingLineNo: block.headingLineNo,
            startLineNo: block.startLineNo,
            endLineNo: block.endLineNo,
            success: false,
            error: preview && preview.error ? preview.error : '解析失败',
            unresolvedLines: Array.isArray(preview && preview.unresolvedLines) ? preview.unresolvedLines : []
        };
    }

    const result = preview.result || {};
    const unresolvedLines = Array.isArray(result.unresolvedLines) ? result.unresolvedLines : [];
    return {
        heading: block.heading,
        headingLineNo: block.headingLineNo,
        startLineNo: block.startLineNo,
        endLineNo: block.endLineNo,
        success: true,
        entryCount: Array.isArray(result.entries) ? result.entries.length : 0,
        playCount: Array.isArray(result.playEntries) ? result.playEntries.length : 0,
        unresolvedCount: unresolvedLines.length,
        totalAmount: Number(result.totalAmount) || 0,
        unresolvedLines: unresolvedLines.map((item) => ({
            ...item,
            globalLineNo: Number.isFinite(Number(item && item.lineNo))
                ? block.startLineNo + Number(item.lineNo) - 1
                : null
        }))
    };
}

function formatAmount(value) {
    if (!Number.isFinite(Number(value))) return '0';
    const numeric = Number(value);
    if (Number.isInteger(numeric)) return String(numeric);
    return numeric.toFixed(4).replace(/\.?0+$/, '');
}

function printSummary(results) {
    const total = results.length;
    const success = results.filter(item => item.success).length;
    const partial = results.filter(item => item.success && item.unresolvedCount > 0).length;
    const failed = results.filter(item => !item.success).length;
    const ordinary = results.reduce((sum, item) => sum + (item.success ? item.entryCount : 0), 0);
    const plays = results.reduce((sum, item) => sum + (item.success ? item.playCount : 0), 0);
    console.log(`消息块总数: ${total}`);
    console.log(`成功: ${success}`);
    console.log(`部分成功: ${partial}`);
    console.log(`失败: ${failed}`);
    console.log(`普通单条目: ${ordinary}`);
    console.log(`玩法单条目: ${plays}`);
}

function printBlockResult(result) {
    const scope = `行 ${result.startLineNo}-${result.endLineNo}`;
    if (!result.success) {
        console.log(`\n[失败] ${result.heading} (${scope})`);
        console.log(`原因: ${result.error}`);
        return;
    }

    console.log(`\n[${result.unresolvedCount > 0 ? '部分成功' : '成功'}] ${result.heading} (${scope})`);
    console.log(`普通单: ${result.entryCount}，玩法单: ${result.playCount}，忽略行: ${result.unresolvedCount}，总额: ${formatAmount(result.totalAmount)}`);
    if (result.unresolvedCount > 0) {
        result.unresolvedLines.slice(0, 8).forEach((item) => {
            const lineLabel = item.globalLineNo ? `全局第 ${item.globalLineNo} 行` : `块内第 ${item.lineNo || '?'} 行`;
            console.log(`  - ${lineLabel}: ${item.rawText} -> ${item.reason}`);
        });
        if (result.unresolvedLines.length > 8) {
            console.log(`  - 其余 ${result.unresolvedLines.length - 8} 行未展开显示`);
        }
    }
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const raw = fs.readFileSync(DATASET_PATH, 'utf8');
    const blocks = splitDatasetBlocks(raw);
    const targetHeading = normalizeHeading(args.block);
    const filteredBlocks = targetHeading
        ? blocks.filter(item => normalizeHeading(item.heading) === targetHeading)
        : blocks;

    if (filteredBlocks.length === 0) {
        console.error('未找到匹配的消息块');
        process.exitCode = 1;
        return;
    }

    const results = filteredBlocks.map(summarizeBlock);
    printSummary(results);
    results
        .filter(item => !args.onlyIssues || !item.success || item.unresolvedCount > 0)
        .forEach(printBlockResult);
}

main();
