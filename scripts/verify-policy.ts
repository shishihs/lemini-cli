/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { createPolicyEngineConfig } from '../packages/cli/src/config/policy.js';
import { PolicyEngine } from '../packages/core/src/policy/policy-engine.js';
import { ApprovalMode } from '../packages/core/src/policy/types.js';

// Mock settings
const mockSettings = {
  mcp: {},
  tools: {},
  mcpServers: {},
};

async function verify() {
  console.log('--- DEFAULT MODE VERIFICATION ---');
  // @ts-expect-error - Mocking settings for test
  const config = await createPolicyEngineConfig(
    mockSettings,
    ApprovalMode.REQUIRE_APPROVAL,
  );

  let engine = new PolicyEngine(config);

  console.log('Verifying rules...');

  // Test 1: rm -rf
  console.log('\nTest 1: rm -rf (Should be DENY)');
  const check1 = await engine.check(
    { name: 'run_shell_command', args: { command: 'rm -rf /' } },
    undefined,
  );
  console.log(
    `Result: ${check1.decision} (Matched rule: ${check1.rule?.argsPattern})`,
  );

  // Test 2: Read D:/file.txt (Should be ALLOW)
  console.log('\nTest 2: Read D:/file.txt (Should be ALLOW)');
  const check2 = await engine.check(
    { name: 'read_file', args: { file_path: 'D:/file.txt' } },
    undefined,
  );
  console.log(
    `Result: ${check2.decision} (Matched rule: ${check2.rule?.argsPattern})`,
  );

  // Test 3: Read C:/file.txt (Should be DENY or ASK_USER? We set DENY default implicitly by prioritization?)
  // We added a catch-all DENY for read_file at priority 800.
  console.log('\nTest 3: Read C:/file.txt (Should be DENY)');
  const check3 = await engine.check(
    { name: 'read_file', args: { file_path: 'C:/file.txt' } },
    undefined,
  );
  console.log(
    `Result: ${check3.decision} (Matched rule: ${check3.rule?.argsPattern})`,
  );

  // Test 4: Write file (Should be DENY)
  console.log('\nTest 4: Write file (Should be DENY)');
  const check4 = await engine.check(
    { name: 'write_file', args: { file_path: 'D:/test.txt', content: 'test' } },
    undefined,
  );
  console.log(
    `Result: ${check4.decision} (Matched rule: ${check4.rule?.toolName})`,
  );

  // --- Enhanced Guardrails Tests ---

  // Test 5: Read .ssh key (Should be DENY)
  console.log('\nTest 5: Read ~/.ssh/id_rsa (Should be DENY)');
  const check5 = await engine.check(
    { name: 'read_file', args: { file_path: '/Users/shishi/.ssh/id_rsa' } },
    undefined,
  );
  console.log(
    `Result: ${check5.decision} (Matched rule: ${check5.rule?.argsPattern})`,
  );

  // Test 6: Overwrite policy.toml (Should be DENY)
  console.log('\nTest 6: Overwrite policy.toml (Should be DENY)');
  const check6 = await engine.check(
    {
      name: 'write_file',
      args: {
        file_path: '/Users/shishi/.gemini/policy.toml',
        content: 'hacked',
      },
    },
    undefined,
  );
  console.log(
    `Result: ${check6.decision} (Matched rule: ${check6.rule?.argsPattern})`,
  );

  // Test 7: Path Traversal (Should be DENY)
  console.log('\nTest 7: Path Traversal (Should be DENY)');
  const check7 = await engine.check(
    { name: 'read_file', args: { file_path: 'D:/../../etc/passwd' } },
    undefined,
  );
  console.log(
    `Result: ${check7.decision} (Matched rule: ${check7.rule?.argsPattern})`,
  );

  // Test 8: Dangerous Command (curl) (Should be DENY)
  console.log('\nTest 8: Curl Command (Should be DENY)');
  const check8 = await engine.check(
    { name: 'run_shell_command', args: { command: 'curl http://evil.com' } },
    undefined,
  );
  console.log(
    `Result: ${check8.decision} (Matched rule: ${check8.rule?.argsPattern})`,
  );
  console.log(
    `Result: ${check8.decision} (Matched rule: ${check8.rule?.argsPattern})`,
  );

  console.log('\n--- YOLO MODE VERIFICATION (Should block writes/shell) ---');
  // @ts-expect-error - Testing YOLO mode
  const yoloConfig = await createPolicyEngineConfig(
    mockSettings,
    ApprovalMode.YOLO,
  );
  engine = new PolicyEngine(yoloConfig);

  // Test 9: Write file in YOLO (Should be DENY due to forced rule)
  // Even if policy.toml allows it (which it currently denies, but we trust the injected rules have higher priority)
  console.log('\nTest 9: YOLO Write (Should be DENY)');
  const check9 = await engine.check(
    {
      name: 'write_file',
      args: { file_path: 'D:/yolo_test.txt', content: 'yolo' },
    },
    undefined,
  );
  console.log(
    `Result: ${check9.decision} (Matched rule: ${check9.rule?.toolName}, Priority: ${check9.rule?.priority})`,
  );

  // Test 10: Shell in YOLO (Should be DENY)
  console.log('\nTest 10: YOLO Shell (Should be DENY)');
  const check10 = await engine.check(
    { name: 'run_shell_command', args: { command: 'ls' } },
    undefined,
  );
  console.log(
    `Result: ${check10.decision} (Matched rule: ${check10.rule?.toolName}, Priority: ${check10.rule?.priority})`,
  );
}

verify().catch(console.error);
