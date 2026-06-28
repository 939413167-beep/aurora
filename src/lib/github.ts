// GitHub API 工具 - 用于云同步灵感数据

import type { Idea, AuroraConfig } from '@/types/idea'

const GITHUB_API = 'https://api.github.com'
// 使用 CORS 代理解决浏览器跨域限制（纯前端静态站点无法直接调用 GitHub API）
const CORS_PROXY = 'https://corsproxy.io/?'

// 获取配置
function getConfig(): AuroraConfig | null {
  const raw = localStorage.getItem('aurora-config')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuroraConfig
  } catch {
    return null
  }
}

// 保存配置
export function saveConfig(config: AuroraConfig): void {
  localStorage.setItem('aurora-config', JSON.stringify(config))
}

// 检查是否已配置 GitHub
export function isGitHubConfigured(): boolean {
  const config = getConfig()
  return !!config?.githubToken && !!config?.githubRepo
}

// GitHub API 请求封装（通过 CORS 代理）
async function githubRequest(path: string, method: string = 'GET', body?: unknown): Promise<Response> {
  const config = getConfig()
  if (!config?.githubToken) throw new Error('GitHub token 未配置')

  const headers: Record<string, string> = {
    Authorization: `token ${config.githubToken}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  }

  const url = `${CORS_PROXY}${encodeURIComponent(GITHUB_API + path)}`
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(`GitHub API 错误: ${error.message || response.statusText}`)
  }

  return response
}

// 获取仓库中文件的内容和 SHA
async function getFileContent(filePath: string): Promise<{ content: string; sha: string } | null> {
  const config = getConfig()
  if (!config) return null

  try {
    const response = await githubRequest(
      `/repos/${config.githubRepo}/contents/${filePath}?ref=${config.githubBranch}`
    )
    const data = await response.json()
    // GitHub API 返回 base64 编码的内容
    const content = atob(data.content.replace(/\n/g, ''))
    return { content, sha: data.sha }
  } catch {
    return null // 文件不存在
  }
}

// 创建或更新文件
async function putFileContent(filePath: string, content: string, sha?: string): Promise<void> {
  const config = getConfig()
  if (!config) throw new Error('未配置 GitHub')

  const body = {
    message: `Aurora: 更新灵感数据 - ${new Date().toISOString()}`,
    content: btoa(unescape(encodeURIComponent(content))), // 支持 Unicode
    sha: sha || undefined,
    branch: config.githubBranch,
  }

  await githubRequest(`/repos/${config.githubRepo}/contents/${filePath}`, 'PUT', body)
}

// 从 GitHub 加载所有灵感
export async function loadIdeasFromGitHub(): Promise<Idea[]> {
  const result = await getFileContent('ideas.json')
  if (!result) return []
  try {
    return JSON.parse(result.content) as Idea[]
  } catch {
    return []
  }
}

// 保存所有灵感到 GitHub
export async function saveIdeasToGitHub(ideas: Idea[]): Promise<void> {
  const existing = await getFileContent('ideas.json')
  const json = JSON.stringify(ideas, null, 2)
  await putFileContent('ideas.json', json, existing?.sha)
}

// 初始化仓库（如果不存在则创建）
export async function ensureRepoExists(): Promise<boolean> {
  const config = getConfig()
  if (!config) return false

  try {
    await githubRequest(`/repos/${config.githubRepo}`)
    return true // 仓库已存在
  } catch {
    // 仓库不存在，尝试创建
    config.githubRepo.split('/')
    try {
      await githubRequest('/user/repos', 'POST', {
        name: config.githubRepo.split('/')[1],
        description: 'Project Aurora - 灵感数据存储',
        private: true,
        auto_init: true,
      })

      // 创建初始数据文件
      const ideas: Idea[] = []
      await putFileContent('ideas.json', JSON.stringify(ideas, null, 2))
      return true
    } catch {
      return false
    }
  }
}

// 验证 GitHub Token 是否有效
export async function validateGitHubToken(token: string): Promise<{ valid: boolean; username: string }> {
  try {
    const url = `${CORS_PROXY}${encodeURIComponent(GITHUB_API + '/user')}`
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })
    if (!response.ok) return { valid: false, username: '' }
    const data = await response.json()
    return { valid: true, username: data.login }
  } catch {
    return { valid: false, username: '' }
  }
}
