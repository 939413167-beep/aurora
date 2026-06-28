// 灵感管理 Hook - 本地缓存 + GitHub 云同步

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Idea } from '@/types/idea'
import {
  loadIdeasFromGitHub,
  saveIdeasToGitHub,
  isGitHubConfigured,
} from '@/lib/github'

const LOCAL_KEY = 'aurora-ideas'

// 从 localStorage 加载
function loadFromLocal(): Idea[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// 保存到 localStorage
function saveToLocal(ideas: Idea[]): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(ideas))
}

// 生成唯一 ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>(loadFromLocal)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const initDone = useRef(false)

  // 首次加载：从 GitHub 拉取数据（如果已配置）
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    if (isGitHubConfigured()) {
      setSyncing(true)
      loadIdeasFromGitHub()
        .then((remoteIdeas) => {
          if (remoteIdeas.length > 0) {
            // 合并策略：以远程数据为主，本地新增的也保留
            const localIdeas = loadFromLocal()
            const remoteIds = new Set(remoteIdeas.map(i => i.id))
            const merged = [
              ...remoteIdeas,
              ...localIdeas.filter(i => !remoteIds.has(i.id)),
            ]
            // 按时间排序（最新的在前）
            merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            setIdeas(merged)
            saveToLocal(merged)
          }
          setSyncError(null)
        })
        .catch((err) => {
          setSyncError(err.message)
        })
        .finally(() => {
          setSyncing(false)
        })
    }
  }, [])

  // 每次本地变更后同步到 GitHub
  const syncToGitHub = useCallback(async (updatedIdeas: Idea[]) => {
    if (!isGitHubConfigured()) return
    setSyncing(true)
    try {
      await saveIdeasToGitHub(updatedIdeas)
      setSyncError(null)
    } catch (err: any) {
      setSyncError(err.message)
    } finally {
      setSyncing(false)
    }
  }, [])

  // 添加灵感
  const addIdea = useCallback((content: string, tags: string[] = []) => {
    const now = new Date().toISOString()
    // 标题：取第一行或前 50 字符
    const lines = content.trim().split('\n')
    const title = lines[0].length > 50
      ? lines[0].substring(0, 50) + '...'
      : lines[0]

    const newIdea: Idea = {
      id: generateId(),
      title: title || '新灵感',
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
      tags,
      isFavorite: false,
    }

    const updated = [newIdea, ...ideas]
    setIdeas(updated)
    saveToLocal(updated)
    syncToGitHub(updated)
    return newIdea
  }, [ideas, syncToGitHub])

  // 更新灵感
  const updateIdea = useCallback((id: string, updates: Partial<Idea>) => {
    const updated = ideas.map(idea =>
      idea.id === id
        ? { ...idea, ...updates, updatedAt: new Date().toISOString() }
        : idea
    )
    setIdeas(updated)
    saveToLocal(updated)
    syncToGitHub(updated)
  }, [ideas, syncToGitHub])

  // 删除灵感
  const deleteIdea = useCallback((id: string) => {
    const updated = ideas.filter(idea => idea.id !== id)
    setIdeas(updated)
    saveToLocal(updated)
    syncToGitHub(updated)
  }, [ideas, syncToGitHub])

  // 切换收藏
  const toggleFavorite = useCallback((id: string) => {
    const updated = ideas.map(idea =>
      idea.id === id ? { ...idea, isFavorite: !idea.isFavorite } : idea
    )
    setIdeas(updated)
    saveToLocal(updated)
    syncToGitHub(updated)
  }, [ideas, syncToGitHub])

  // 手动拉取远程数据
  const pullFromGitHub = useCallback(async () => {
    if (!isGitHubConfigured()) return
    setSyncing(true)
    try {
      const remoteIdeas = await loadIdeasFromGitHub()
      const localIdeas = loadFromLocal()
      const remoteIds = new Set(remoteIdeas.map(i => i.id))
      const merged = [
        ...remoteIdeas,
        ...localIdeas.filter(i => !remoteIds.has(i.id)),
      ]
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setIdeas(merged)
      saveToLocal(merged)
      setSyncError(null)
    } catch (err: any) {
      setSyncError(err.message)
    } finally {
      setSyncing(false)
    }
  }, [])

  return {
    ideas,
    syncing,
    syncError,
    addIdea,
    updateIdea,
    deleteIdea,
    toggleFavorite,
    pullFromGitHub,
  }
}
