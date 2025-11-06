/**
 * 测试 message-filter.js 的过滤功能
 */
import { filterText, filterMessages, filterMessageContent, filterSystemContent } from './message-filter.js';

console.log('=== 开始测试 message-filter.js ===\n');

// 测试 1: filterText - 基础文本过滤
console.log('【测试 1】filterText - 基础文本过滤');
const testTexts = [
  'I am GitHub Copilot, how can I help?',
  'Claude Code is here to assist',
  'Using ChatGPT for coding',
  'Cursor and Windsurf are great tools',
  'Hello from Cline and Aider',
  'This is a normal message without AI names'
];

testTexts.forEach((text, i) => {
  const filtered = filterText(text);
  console.log(`  输入 ${i + 1}: "${text}"`);
  console.log(`  输出 ${i + 1}: "${filtered}"`);
  console.log(`  ${text !== filtered ? '✅ 已过滤' : '⚪ 无变化'}\n`);
});

// 测试 2: filterMessageContent - 字符串格式的消息内容
console.log('\n【测试 2】filterMessageContent - 字符串格式');
const stringContent = 'I am using GitHub Copilot and ChatGPT';
const filteredString = filterMessageContent(stringContent);
console.log(`  输入: "${stringContent}"`);
console.log(`  输出: "${filteredString}"`);
console.log(`  ${stringContent !== filteredString ? '✅ 已过滤' : '❌ 未过滤'}\n`);

// 测试 3: filterMessageContent - 数组格式的消息内容（OpenAI/Anthropic 格式）
console.log('\n【测试 3】filterMessageContent - 数组格式（多模态消息）');
const arrayContent = [
  { type: 'text', text: 'I am using Claude Code and Cursor' },
  { type: 'text', text: 'Also trying Windsurf' },
  { type: 'image_url', url: 'https://example.com/image.jpg' }
];
const filteredArray = filterMessageContent(arrayContent);
console.log('  输入:');
arrayContent.forEach((part, i) => {
  console.log(`    [${i}] ${JSON.stringify(part)}`);
});
console.log('  输出:');
filteredArray.forEach((part, i) => {
  console.log(`    [${i}] ${JSON.stringify(part)}`);
});
const arrayChanged = JSON.stringify(arrayContent) !== JSON.stringify(filteredArray);
console.log(`  ${arrayChanged ? '✅ 已过滤' : '❌ 未过滤'}\n`);

// 测试 4: filterMessages - 完整消息数组（模拟真实 API 请求）
console.log('\n【测试 4】filterMessages - 完整消息数组');
const messages = [
  {
    role: 'system',
    content: 'You are GitHub Copilot, a helpful assistant'
  },
  {
    role: 'user',
    content: 'Hi ChatGPT, can you help me?'
  },
  {
    role: 'assistant',
    content: 'Sure, I am Claude Code'
  },
  {
    role: 'user',
    content: [
      { type: 'text', text: 'I love using Cursor and Windsurf' },
      { type: 'text', text: 'Also Cline is great' }
    ]
  }
];

const filteredMessages = filterMessages(messages);
console.log('  输入消息:');
messages.forEach((msg, i) => {
  console.log(`    [${i}] role: ${msg.role}`);
  if (typeof msg.content === 'string') {
    console.log(`        content: "${msg.content}"`);
  } else {
    console.log(`        content: ${JSON.stringify(msg.content)}`);
  }
});

console.log('\n  输出消息:');
filteredMessages.forEach((msg, i) => {
  console.log(`    [${i}] role: ${msg.role}`);
  if (typeof msg.content === 'string') {
    console.log(`        content: "${msg.content}"`);
  } else {
    console.log(`        content: ${JSON.stringify(msg.content)}`);
  }
});

const messagesChanged = JSON.stringify(messages) !== JSON.stringify(filteredMessages);
console.log(`\n  ${messagesChanged ? '✅ 已过滤' : '❌ 未过滤'}\n`);

// 测试 5: filterSystemContent - 系统内容过滤
console.log('\n【测试 5】filterSystemContent - 系统内容');

// 字符串格式
const systemString = 'You are GitHub Copilot';
const filteredSystemString = filterSystemContent(systemString);
console.log(`  字符串输入: "${systemString}"`);
console.log(`  字符串输出: "${filteredSystemString}"`);
console.log(`  ${systemString !== filteredSystemString ? '✅ 已过滤' : '❌ 未过滤'}\n`);

// 数组格式
const systemArray = [
  { type: 'text', text: 'You are Claude Code' },
  { type: 'text', text: 'Also known as ChatGPT' }
];
const filteredSystemArray = filterSystemContent(systemArray);
console.log('  数组输入:');
systemArray.forEach((part, i) => {
  console.log(`    [${i}] ${JSON.stringify(part)}`);
});
console.log('  数组输出:');
filteredSystemArray.forEach((part, i) => {
  console.log(`    [${i}] ${JSON.stringify(part)}`);
});
const systemArrayChanged = JSON.stringify(systemArray) !== JSON.stringify(filteredSystemArray);
console.log(`  ${systemArrayChanged ? '✅ 已过滤' : '❌ 未过滤'}\n`);

// 测试 6: 边界情况测试
console.log('\n【测试 6】边界情况测试');

// null/undefined
console.log('  null 输入:', filterText(null));
console.log('  undefined 输入:', filterText(undefined));
console.log('  空字符串:', filterText(''));
console.log('  空数组:', JSON.stringify(filterMessages([])));

// 大小写混合
const mixedCase = 'github copilot and CHATGPT and CuRsOr';
const filteredMixed = filterText(mixedCase);
console.log(`\n  大小写混合: "${mixedCase}"`);
console.log(`  过滤结果: "${filteredMixed}"`);
console.log(`  ${mixedCase !== filteredMixed ? '✅ 已过滤' : '❌ 未过滤'}`);

console.log('\n=== 测试完成 ===');