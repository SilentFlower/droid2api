// Cloudflare Workers 版本的配置文件
// 原 config.json 的内容转换为 JavaScript 对象

export const config = {
  model_redirects: {
    "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
    "claude-sonnet-4-5": "claude-sonnet-4-5-20250929",
    "gpt-5": "gpt-5-2025-08-07"
  },
  endpoint: [
    {
      name: "openai",
      base_url: "https://app.factory.ai/api/llm/o/v1/responses"
    },
    {
      name: "anthropic",
      base_url: "https://app.factory.ai/api/llm/a/v1/messages"
    },
    {
      name: "common",
      base_url: "https://app.factory.ai/api/llm/o/v1/chat/completions"
    }
  ],
  models: [
    {
      name: "Opus 4.1",
      id: "claude-opus-4-1-20250805",
      type: "anthropic",
      reasoning: "auto"
    },
    {
      name: "Haiku 4.5",
      id: "claude-haiku-4-5-20251001",
      type: "anthropic",
      reasoning: "auto"
    },
    {
      name: "Sonnet 4.5",
      id: "claude-sonnet-4-5-20250929",
      type: "anthropic",
      reasoning: "auto"
    },
    {
      name: "GPT-5",
      id: "gpt-5-2025-08-07",
      type: "openai",
      reasoning: "auto"
    },
    {
      name: "GPT-5-Codex",
      id: "gpt-5-codex",
      type: "openai",
      reasoning: "off"
    },
    {
      name: "GLM-4.6",
      id: "glm-4.6",
      type: "common"
    }
  ],
  dev_mode: false,
  user_agent: "factory-cli/0.22.2",
  system_prompt: "You are Droid, an AI software engineering agent built by Factory.\n\n"
};

// 辅助函数
export function getConfig() {
  return config;
}

export function getModelById(modelId) {
  return config.models.find(m => m.id === modelId);
}

export function getEndpointByType(type) {
  return config.endpoint.find(e => e.name === type);
}

export function isDevMode() {
  return config.dev_mode === true;
}

export function getSystemPrompt() {
  return config.system_prompt || '';
}

export function getModelReasoning(modelId) {
  const model = getModelById(modelId);
  if (!model || !model.reasoning) {
    return null;
  }
  const reasoningLevel = model.reasoning.toLowerCase();
  if (['low', 'medium', 'high', 'auto'].includes(reasoningLevel)) {
    return reasoningLevel;
  }
  return null;
}

export function getUserAgent() {
  return config.user_agent || 'factory-cli/0.22.2';
}

export function getRedirectedModelId(modelId) {
  if (config.model_redirects && config.model_redirects[modelId]) {
    const redirectedId = config.model_redirects[modelId];
    console.log(`[REDIRECT] Model redirected: ${modelId} -> ${redirectedId}`);
    return redirectedId;
  }
  return modelId;
}