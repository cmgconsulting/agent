import type { McpDiscoveredTool } from '@/types/database'

// ============================================
// MCP Client — SSE Transport (JSON-RPC 2.0)
// ============================================

const MCP_TIMEOUT = 30_000
const MCP_PROTOCOL_VERSION = '2024-11-05'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

interface McpToolCallResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>
  isError?: boolean
}

// ============================================
// SSE-based MCP communication
// ============================================

async function mcpRequest(
  serverUrl: string,
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  const requestId = Date.now()

  const rpcRequest: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: requestId,
    method,
    ...(params ? { params } : {}),
  }

  // For Streamable HTTP transport (the modern MCP standard)
  // POST JSON-RPC to the server URL, expect JSON-RPC response
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), MCP_TIMEOUT)

  try {
    const res = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(rpcRequest),
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`MCP server returned ${res.status}: ${res.statusText}`)
    }

    const contentType = res.headers.get('content-type') || ''

    // If server responds with JSON directly
    if (contentType.includes('application/json')) {
      const response = await res.json() as JsonRpcResponse
      if (response.error) {
        throw new Error(`MCP error ${response.error.code}: ${response.error.message}`)
      }
      return response.result
    }

    // If server responds with SSE stream, read until we get our response
    if (contentType.includes('text/event-stream')) {
      return await readSseResponse(res, requestId)
    }

    // Fallback: try to parse as JSON
    const text = await res.text()
    try {
      const response = JSON.parse(text) as JsonRpcResponse
      if (response.error) {
        throw new Error(`MCP error ${response.error.code}: ${response.error.message}`)
      }
      return response.result
    } catch {
      throw new Error(`Unexpected MCP response: ${text.slice(0, 200)}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function readSseResponse(res: Response, expectedId: number): Promise<unknown> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (!data) continue
          try {
            const response = JSON.parse(data) as JsonRpcResponse
            if (response.id === expectedId) {
              if (response.error) {
                throw new Error(`MCP error ${response.error.code}: ${response.error.message}`)
              }
              return response.result
            }
          } catch (e) {
            if (e instanceof Error && e.message.startsWith('MCP error')) throw e
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  throw new Error('MCP stream ended without response')
}

// ============================================
// Public API
// ============================================

export async function initializeMcp(serverUrl: string): Promise<{
  serverInfo: Record<string, unknown>
  capabilities: Record<string, unknown>
}> {
  const result = await mcpRequest(serverUrl, 'initialize', {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'cmg-agents', version: '1.0.0' },
  }) as { serverInfo: Record<string, unknown>; capabilities: Record<string, unknown> }

  // Send initialized notification
  await fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    }),
  }).catch(() => {
    // Notification failures are non-fatal
  })

  return result
}

export async function listMcpTools(serverUrl: string): Promise<McpDiscoveredTool[]> {
  await initializeMcp(serverUrl)

  const result = await mcpRequest(serverUrl, 'tools/list') as {
    tools: Array<{
      name: string
      description?: string
      inputSchema?: Record<string, unknown>
    }>
  }

  return (result.tools || []).map(tool => ({
    name: tool.name,
    description: tool.description || '',
    input_schema: tool.inputSchema || { type: 'object', properties: {} },
  }))
}

export async function callMcpTool(
  serverUrl: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<McpToolCallResult> {
  await initializeMcp(serverUrl)

  const result = await mcpRequest(serverUrl, 'tools/call', {
    name: toolName,
    arguments: args,
  }) as McpToolCallResult

  return result
}

export async function testMcpConnection(serverUrl: string): Promise<{
  ok: boolean
  message: string
  tools?: McpDiscoveredTool[]
}> {
  try {
    const { serverInfo } = await initializeMcp(serverUrl)
    const tools = await listMcpTools(serverUrl)
    const serverName = (serverInfo as { name?: string })?.name || 'MCP Server'

    return {
      ok: true,
      message: `Connecte a ${serverName} — ${tools.length} tool(s) disponible(s)`,
      tools,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    return { ok: false, message: `Connexion MCP echouee: ${msg}` }
  }
}
