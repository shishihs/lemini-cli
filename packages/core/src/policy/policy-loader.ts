import * as fs from 'node:fs/promises';
import { parse } from 'smol-toml';
import type { PolicyEngineConfig, PolicyRule } from './types.js';
import { PolicyDecision } from './types.js';
import { debugLogger } from '../utils/debugLogger.js';

interface TomlPolicyRule {
  tool?: string;
  args_pattern?: string;
  decision?: string;
  priority?: number;
}

interface TomlPolicyConfig {
  rules?: TomlPolicyRule[];
}

export async function loadPolicyConfig(
  filePath: string,
): Promise<PolicyEngineConfig> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const tomlConfig = parse(fileContent) as TomlPolicyConfig;

    const rules: PolicyRule[] = (tomlConfig.rules || []).map((rule) => {
      let decision = PolicyDecision.ASK_USER;
      if (rule.decision?.toUpperCase() === 'ALLOW') {
        decision = PolicyDecision.ALLOW;
      } else if (rule.decision?.toUpperCase() === 'DENY') {
        decision = PolicyDecision.DENY;
      }

      return {
        toolName: rule.tool,
        argsPattern: rule.args_pattern
          ? new RegExp(rule.args_pattern)
          : undefined,
        decision,
        priority: rule.priority,
      };
    });

    debugLogger.debug(`Loaded ${rules.length} rules from ${filePath}`);

    return {
      rules,
    };
  } catch (error) {
    debugLogger.log(`Failed to load policy from ${filePath}: ${error}`);
    // Return empty config if loading fails (or should we throw?)
    // For now, robustly return empty to avoid breaking startup if file is missing/corrupt
    return { rules: [] };
  }
}
