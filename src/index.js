import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  getConfig,
  getModelById,
  getEndpointByType,
  getRedirectedModelId,
  getSystemPrompt,
  getModelReasoning,
  getUserAgent
} from './worker-config.js';
import { getApiKey, logInfo, logError, logDebug } from './worker-auth.js';

// 导入 transformers（需要适配为 Workers 版本）
import { transformToAnthropic, getAnthropicHeaders } from '../transformers/request-anthropic.js';
import { transformToOpenAI, getOpenAIHeaders } from '../transformers/request-openai.js';
import { AnthropicResponseTransformer } from '../transformers/response-anthropic.js';
import { OpenAIResponseTransformer } from '../transformers/response-openai.js';

const app = new Hono();

// CORS 中间件
app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'anthropic-version'],
}));

// 根路径
app.get('/', (c) => {
  return c.json({
    name: 'droid2api-worker',
    version: '1.0.0',
    description: 'OpenAI Compatible API Proxy (Cloudflare Workers)',
    endpoints: [
      'GET /v1/models',
      'POST /v1/chat/completions',
      'POST /v1/responses',
      'POST /v1/messages'
    ]
  });
});

// 获取模型列表
app.get('/v1/models', (c) => {
  logInfo('GET /v1/models');
  
  try {
    const config = getConfig();
    const models = config.models.map(model => ({
      id: model.id,
      object: 'model',
      created: Date.now(),
      owned_by: model.type,
      permission: [],
      root: model.id,
      parent: null
    }));

    return c.json({
      object: 'list',
      data: models
    });
  } catch (error) {
    logError('Error in GET /v1/models', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// 聊天补全端点（带格式转换）
app.post('/v1/chat/completions', async (c) => {
  logInfo('POST /v1/chat/completions');

  try {
    const openaiRequest = await c.req.json();
    const modelId = getRedirectedModelId(openaiRequest.model);

    if (!modelId) {
      return c.json({ error: 'model is required' }, 400);
    }

    const model = getModelById(modelId);
    if (!model) {
      return c.json({ error: `Model ${modelId} not found` }, 404);
    }

    const endpoint = getEndpointByType(model.type);
    if (!endpoint) {
      return c.json({ error: `Endpoint type ${model.type} not found` }, 500);
    }

    logInfo(`Routing to ${model.type} endpoint: ${endpoint.base_url}`);

    // 获取 API key（从环境变量或客户端）
    const authHeader = getApiKey(
      c.req.header('authorization'),
      c.env
    );

    let transformedRequest;
    let headers;
    const clientHeaders = Object.fromEntries(c.req.raw.headers);

    // 更新请求体中的模型 ID
    const requestWithRedirectedModel = { ...openaiRequest, model: modelId };

    // 准备 transformer 选项
    const transformerOptions = {
      getSystemPrompt,
      getModelReasoning,
      getUserAgent,
      logDebug
    };

    // 根据模型类型转换请求
    if (model.type === 'anthropic') {
      transformedRequest = transformToAnthropic(requestWithRedirectedModel, transformerOptions);
      const isStreaming = openaiRequest.stream === true;
      headers = getAnthropicHeaders(authHeader, clientHeaders, isStreaming, modelId, transformerOptions);
    } else if (model.type === 'openai') {
      transformedRequest = transformToOpenAI(requestWithRedirectedModel, transformerOptions);
      headers = getOpenAIHeaders(authHeader, clientHeaders, transformerOptions);
    } else if (model.type === 'common') {
      // common 类型直接转发
      transformedRequest = requestWithRedirectedModel;
      headers = {
        'content-type': 'application/json',
        'authorization': authHeader || ''
      };
    } else {
      return c.json({ error: `Unknown endpoint type: ${model.type}` }, 500);
    }

    // 发送请求到上游
    const response = await fetch(endpoint.base_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(transformedRequest)
    });

    logInfo(`Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      logError(`Endpoint error: ${response.status}`, new Error(errorText));
      return c.json({ 
        error: `Endpoint returned ${response.status}`,
        details: errorText 
      }, response.status);
    }

    const isStreaming = transformedRequest.stream === true;

    if (isStreaming) {
      // 流式响应
      if (model.type === 'common') {
        // common 类型直接转发流
        return new Response(response.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        });
      } else {
        // anthropic 和 openai 类型使用 transformer
        let transformer;
        if (model.type === 'anthropic') {
          transformer = new AnthropicResponseTransformer(modelId, `chatcmpl-${Date.now()}`);
        } else if (model.type === 'openai') {
          transformer = new OpenAIResponseTransformer(modelId, `chatcmpl-${Date.now()}`);
        }

        // 创建转换后的流
        const transformedStream = transformer.transformStream(response.body);
        
        return new Response(transformedStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        });
      }
    } else {
      // 非流式响应
      const data = await response.json();
      return c.json(data);
    }

  } catch (error) {
    logError('Error in /v1/chat/completions', error);
    return c.json({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
});

// 直接转发 OpenAI 请求（/v1/responses）
app.post('/v1/responses', async (c) => {
  logInfo('POST /v1/responses');

  try {
    const openaiRequest = await c.req.json();
    const modelId = getRedirectedModelId(openaiRequest.model);

    if (!modelId) {
      return c.json({ error: 'model is required' }, 400);
    }

    const model = getModelById(modelId);
    if (!model) {
      return c.json({ error: `Model ${modelId} not found` }, 404);
    }

    if (model.type !== 'openai') {
      return c.json({ 
        error: 'Invalid endpoint type',
        message: `/v1/responses 接口只支持 openai 类型端点`
      }, 400);
    }

    const endpoint = getEndpointByType(model.type);
    const authHeader = getApiKey(
      c.req.header('authorization') || c.req.header('x-api-key'),
      c.env
    );

    const clientHeaders = Object.fromEntries(c.req.raw.headers);
    const headers = getOpenAIHeaders(authHeader, clientHeaders);

    // 注入系统提示
    const systemPrompt = getSystemPrompt();
    const modifiedRequest = { ...openaiRequest, model: modelId };
    if (systemPrompt) {
      modifiedRequest.instructions = systemPrompt + (modifiedRequest.instructions || '');
    }

    // 处理 reasoning 字段
    const reasoningLevel = getModelReasoning(modelId);
    if (reasoningLevel === 'auto') {
      // 保持原样
    } else if (reasoningLevel && ['low', 'medium', 'high'].includes(reasoningLevel)) {
      modifiedRequest.reasoning = {
        effort: reasoningLevel,
        summary: 'auto'
      };
    } else {
      delete modifiedRequest.reasoning;
    }

    const response = await fetch(endpoint.base_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(modifiedRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ 
        error: `Endpoint returned ${response.status}`,
        details: errorText 
      }, response.status);
    }

    const isStreaming = openaiRequest.stream === true;

    if (isStreaming) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      const data = await response.json();
      return c.json(data);
    }

  } catch (error) {
    logError('Error in /v1/responses', error);
    return c.json({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
});

// 直接转发 Anthropic 请求（/v1/messages）
app.post('/v1/messages', async (c) => {
  logInfo('POST /v1/messages');

  try {
    const anthropicRequest = await c.req.json();
    const modelId = getRedirectedModelId(anthropicRequest.model);

    if (!modelId) {
      return c.json({ error: 'model is required' }, 400);
    }

    const model = getModelById(modelId);
    if (!model) {
      return c.json({ error: `Model ${modelId} not found` }, 404);
    }

    if (model.type !== 'anthropic') {
      return c.json({ 
        error: 'Invalid endpoint type',
        message: `/v1/messages 接口只支持 anthropic 类型端点`
      }, 400);
    }

    const endpoint = getEndpointByType(model.type);
    const authHeader = getApiKey(
      c.req.header('authorization') || c.req.header('x-api-key'),
      c.env
    );

    const clientHeaders = Object.fromEntries(c.req.raw.headers);
    const isStreaming = anthropicRequest.stream === true;
    const headers = getAnthropicHeaders(authHeader, clientHeaders, isStreaming, modelId);

    // 注入系统提示
    const systemPrompt = getSystemPrompt();
    const modifiedRequest = { ...anthropicRequest, model: modelId };
    if (systemPrompt) {
      if (modifiedRequest.system && Array.isArray(modifiedRequest.system)) {
        modifiedRequest.system = [
          { type: 'text', text: systemPrompt },
          ...modifiedRequest.system
        ];
      } else {
        modifiedRequest.system = [
          { type: 'text', text: systemPrompt }
        ];
      }
    }

    // 处理 thinking 字段
    const reasoningLevel = getModelReasoning(modelId);
    if (reasoningLevel === 'auto') {
      // 保持原样
    } else if (reasoningLevel && ['low', 'medium', 'high'].includes(reasoningLevel)) {
      const budgetTokens = {
        'low': 4096,
        'medium': 12288,
        'high': 24576
      };
      modifiedRequest.thinking = {
        type: 'enabled',
        budget_tokens: budgetTokens[reasoningLevel]
      };
    } else {
      delete modifiedRequest.thinking;
    }

    const response = await fetch(endpoint.base_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(modifiedRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return c.json({ 
        error: `Endpoint returned ${response.status}`,
        details: errorText 
      }, response.status);
    }

    if (isStreaming) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      const data = await response.json();
      return c.json(data);
    }

  } catch (error) {
    logError('Error in /v1/messages', error);
    return c.json({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
});

// 404 处理
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: `路径 ${c.req.method} ${c.req.path} 不存在`,
    availableEndpoints: [
      'GET /v1/models',
      'POST /v1/chat/completions',
      'POST /v1/responses',
      'POST /v1/messages'
    ]
  }, 404);
});

// 错误处理
app.onError((err, c) => {
  logError('Unhandled error', err);
  return c.json({
    error: 'Internal server error',
    message: err.message
  }, 500);
});

// 导出 Workers 入口
export default app;