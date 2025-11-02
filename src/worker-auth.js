// Cloudflare Workers 版本的认证逻辑（简化版）
// 仅支持固定 API key，移除了自动刷新功能

/**
 * 获取 API Key
 * 优先级：环境变量 > 客户端 authorization 头
 * @param {string} clientAuth - 客户端提供的 authorization 头
 * @param {object} env - Workers 环境变量
 * @returns {string} API Key
 */
export function getApiKey(clientAuth, env) {
  // 优先使用环境变量中的固定 API key
  if (env.FACTORY_API_KEY) {
    return env.FACTORY_API_KEY;
  }
  
  // 回退到客户端提供的 authorization
  if (clientAuth) {
    // 如果是 Bearer token 格式，直接返回
    if (clientAuth.startsWith('Bearer ')) {
      return clientAuth;
    }
    // 否则添加 Bearer 前缀
    return `Bearer ${clientAuth}`;
  }
  
  // 如果都没有，返回空字符串（某些端点可能不需要认证）
  return '';
}

/**
 * 日志函数（简化版）
 */
export function logInfo(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [INFO] ${message}`, data);
  } else {
    console.log(`[${timestamp}] [INFO] ${message}`);
  }
}

export function logError(message, error = null) {
  const timestamp = new Date().toISOString();
  if (error) {
    console.error(`[${timestamp}] [ERROR] ${message}`, error);
  } else {
    console.error(`[${timestamp}] [ERROR] ${message}`);
  }
}

export function logDebug(message, data = null) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [DEBUG] ${message}`, data);
  } else {
    console.log(`[${timestamp}] [DEBUG] ${message}`);
  }
}

export function logRequest(method, url, headers, body = null) {
  logInfo(`${method} ${url}`);
  logDebug('Request headers', headers);
  if (body) {
    logDebug('Request body', body);
  }
}

export function logResponse(status, headers = null, body = null) {
  logInfo(`Response status: ${status}`);
  if (headers) {
    logDebug('Response headers', headers);
  }
  if (body) {
    logDebug('Response body', body);
  }
}