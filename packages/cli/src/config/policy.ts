/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as os from 'node:os';
import * as path from 'node:path';
import {
  type PolicyEngineConfig,
  ApprovalMode,
  type PolicyEngine,
  type MessageBus,
  type PolicySettings,
  createPolicyEngineConfig as createCorePolicyEngineConfig,
  createPolicyUpdater as createCorePolicyUpdater,
  loadPolicyConfig,
  type PolicyRule,
  PolicyDecision,
} from '@google/gemini-cli-core';
import { type Settings } from './settings.js';

export async function createPolicyEngineConfig(
  settings: Settings,
  approvalMode: ApprovalMode,
): Promise<PolicyEngineConfig> {
  // Explicitly construct PolicySettings from Settings to ensure type safety
  // and avoid accidental leakage of other settings properties.
  const policySettings: PolicySettings = {
    mcp: settings.mcp,
    tools: settings.tools,
    mcpServers: settings.mcpServers,
  };

  const coreConfig = await createCorePolicyEngineConfig(
    policySettings,
    approvalMode,
  );

  const policyPath = path.join(os.homedir(), '.gemini', 'policy.toml');
  const persistentConfig = await loadPolicyConfig(policyPath);

  const params = {
    ...coreConfig,
    rules: [...(coreConfig.rules ?? []), ...(persistentConfig.rules ?? [])],
  };

  // Enforce read-only for YOLO mode
  if (approvalMode === ApprovalMode.YOLO) {
    // Whitelist for safe investigation commands
    // Matches {"command":"(git|ls|grep|cat|find|npm|node)..."}
    // Note: We use a regex that matches the stringified JSON argument structure.
    const safeYoloPattern =
      /^{\s*"command"\s*:\s*"(?:git|ls|grep|rg|cat|find|npm\s+(?:run\s+)?test|node|pwd|whoami|head|tail|wc|diff|du|df|env|printenv|stat|ps|date)\b/;

    const yoloRestrictions: PolicyRule[] = [
      { toolName: 'write_file', decision: PolicyDecision.DENY, priority: 2000 },
      { toolName: 'replace', decision: PolicyDecision.DENY, priority: 2000 },
      {
        toolName: 'write_todos',
        decision: PolicyDecision.DENY,
        priority: 2000,
      },
      // ALLOW safe investigation commands
      {
        toolName: 'run_shell_command',
        argsPattern: safeYoloPattern,
        decision: PolicyDecision.ALLOW,
        priority: 2001,
      },
      // DENY all other shell commands
      {
        toolName: 'run_shell_command',
        decision: PolicyDecision.DENY,
        priority: 2000,
      },
    ];
    params.rules = [...(params.rules ?? []), ...yoloRestrictions];
  }

  return params;
}

export function createPolicyUpdater(
  policyEngine: PolicyEngine,
  messageBus: MessageBus,
) {
  return createCorePolicyUpdater(policyEngine, messageBus);
}
