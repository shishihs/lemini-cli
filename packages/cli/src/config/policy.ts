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

  let params = {
    ...coreConfig,
    rules: [...(coreConfig.rules ?? []), ...(persistentConfig.rules ?? [])],
  };

  // Enforce read-only for YOLO mode
  if (approvalMode === ApprovalMode.YOLO) {
    const yoloRestrictions: PolicyRule[] = [
      { toolName: 'write_file', decision: PolicyDecision.DENY, priority: 2000 },
      { toolName: 'replace', decision: PolicyDecision.DENY, priority: 2000 },
      {
        toolName: 'write_todos',
        decision: PolicyDecision.DENY,
        priority: 2000,
      },
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
