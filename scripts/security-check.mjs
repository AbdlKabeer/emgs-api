#!/usr/bin/env node

/**
 * Prembly Security Scanner
 * Static Analysis & Secret / Injection Vulnerability Scanner
 * 
 * Inspects all source files for:
 * 1. Malicious script injections & dangerous execution sinks (eval, Function constructor, atob eval, document.write)
 * 2. Unsafe DOM innerHTML assignments without sanitization
 * 3. Suspicious remote CDN script tags or unknown external telemetry
 * 4. Hardcoded private keys, JWTs, AWS credentials, or live secret keys
 * 5. Dangerous ReDoS patterns
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, '');

const DANGEROUS_PATTERNS = [
  {
    name: 'Dynamic Code Execution (eval / Function)',
    regex: /\b(eval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*["'`]|setInterval\s*\(\s*["'`])/i,
    severity: 'CRITICAL',
    description: 'Dynamic code execution is strictly prohibited as it enables arbitrary code execution / XSS.'
  },
  {
    name: 'Obfuscated Base64 Payload Execution',
    regex: /\b(atob\s*\(|Buffer\.from\s*\(.*['"]base64['"]\))/i,
    severity: 'CRITICAL',
    description: 'Potential obfuscated binary or script payload execution detected.'
  },
  {
    name: 'Unsanitized HTML / DOM Sink',
    regex: /(innerHTML\s*=|outerHTML\s*=|document\.write\s*\(|dangerouslySetInnerHTML)/i,
    severity: 'HIGH',
    description: 'Direct DOM manipulation or dangerouslySetInnerHTML detected without DOMPurify protection.'
  },
  {
    name: 'Hardcoded Live Secret / API Key Pattern',
    regex: /(sk_live_[0-9a-zA-Z]{24,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----)/,
    severity: 'CRITICAL',
    description: 'Live secret key or private cryptographic key detected.'
  },
  {
    name: 'Insecure Dynamic Script Element Injection',
    regex: /document\.createElement\s*\(\s*['"]script['"]\s*\)/i,
    severity: 'CRITICAL',
    description: 'Dynamic script tag creation detected.'
  },
  {
    name: 'Suspicious Obfuscator Loop (Javascript-Obfuscator)',
    regex: /\b(parseInt\s*\(\s*0x[0-9a-fA-F]+\s*\)|parseFloat\s*\([^)]+\)).{1,50}(Math\.(floor|max|ceil|trunc)|parseInt|parseFloat)/,
    severity: 'CRITICAL',
    description: 'Potential obfuscated javascript payload loop detected (e.g., javascript-obfuscator signature).'
  },
  {
    name: 'Suspicious Global Injection',
    regex: /global\s*(\.|\[\s*['"])[a-zA-Z0-9_$!]+(['"]\s*\])?\s*=\s*['"][^'"]+['"];\s*(const|let|var)\s+[_a-zA-Z$][a-zA-Z0-9_$]*\s*=\s*[_a-zA-Z$]/,
    severity: 'CRITICAL',
    description: 'Suspicious global assignment chained with obfuscated variables detected.'
  },
  {
    name: 'Unicode Obfuscated Node.js Require',
    regex: /require\s*\(\s*['"](\\u[0-9a-fA-F]{4})+['"]\s*\)/i,
    severity: 'CRITICAL',
    description: 'Highly suspicious require() call using Unicode escaped strings (often used to hide "http", "child_process", etc).'
  },
  {
    name: 'Known Malicious Global Backdoor (A8/8 Payload)',
    regex: /global\s*(\.|\[\s*['"])[a-zA-Z0-9_$!]+(['"]\s*\])?\s*=\s*["'][A-Z0-9]*-[0-9-]+["']/i,
    severity: 'CRITICAL',
    description: 'Known malicious payload signature detected (e.g. A8-xxxx or 8-xxxx). Indicates active repository compromise.'
  },
  {
    name: 'Hexadecimal Variable Obfuscation Array',
    regex: /var\s+_0x[a-fA-F0-9]+\s*=\s*_0x[a-fA-F0-9]+;\s*function\s+_0x[a-fA-F0-9]+\s*\(\)\s*\{\s*var\s+_0x[a-fA-F0-9]+\s*=\s*\[/i,
    severity: 'CRITICAL',
    description: 'Heavy hexadecimal variable obfuscation and array rotation detected.'
  }
];

const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'out',
  'build',
  'dist',
  'coverage',
  'recovery-mobile'
]);

const IGNORED_FILES = new Set([
  'package-lock.json',
  '+html.tsx',
  'google-auth.tsx',
  'rich-text-editor.tsx'
]);

let totalFilesScanned = 0;
let violations = [];

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs|cjs|html|json)$/i.test(entry.name)) {
      if (!IGNORED_FILES.has(entry.name)) {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  totalFilesScanned++;
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    // Skip scanner itself
    if (filePath.includes('security-check.mjs')) return;

    for (const rule of DANGEROUS_PATTERNS) {
      if (rule.regex.test(line)) {
        // Exclude safe comments or DOMPurify usages
        if (rule.name.includes('Unsanitized HTML') && line.includes('DOMPurify.sanitize')) {
          continue;
        }

        violations.push({
          file: path.relative(ROOT_DIR, filePath),
          line: lineIndex + 1,
          rule: rule.name,
          severity: rule.severity,
          snippet: line.trim(),
          description: rule.description
        });
      }
    }
  });
}

console.log('\x1b[36m%s\x1b[0m', '🛡️  Prembly Codebase Security & Anti-Malicious Injection Scan...');
console.log(`🔍 Scanning directory: ${SRC_DIR}\n`);

scanDirectory(SRC_DIR);

if (violations.length === 0) {
  console.log('\x1b[32m%s\x1b[0m', `✅ Security scan passed cleanly! Scanned ${totalFilesScanned} files with ZERO vulnerabilities or malicious patterns.`);
  process.exit(0);
} else {
  console.error('\x1b[31m%s\x1b[0m', `❌ SECURITY VIOLATIONS DETECTED (${violations.length} issues):`);
  
  violations.forEach(v => {
    console.error(`\n[${v.severity}] ${v.rule} in ${v.file}:${v.line}`);
    console.error(`  Snippet: ${v.snippet}`);
    console.error(`  Details: ${v.description}`);
  });

  console.error('\n\x1b[31m%s\x1b[0m', '🚨 Commit/Build aborted due to security violations. Please resolve the detected security risks above.');
  process.exit(1);
}
