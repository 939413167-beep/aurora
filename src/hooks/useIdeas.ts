// 灵感管理 Hook - 本地缓存 + GitHub 云同步
// 修复：使用函数式状态更新避免 stale closure

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
  const needsSync = useRef(false)

  // 首次加载：从 GitHub 拉取数据（如果已配置）
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true

    if (isGitHubConfigured()) {
      setSyncing(true)
      loadIdeasFromGitHub()
        .then((remoteIdeas) => {
          if (remoteIdeas.length > 0) {
            const localIdeas = loadFromLocal()
            const remoteIds = new Set(remoteIdeas.map(i => i.id))
            const merged = [
              ...remoteIdeas,
              ...localIdeas.filter(i => !remoteIds.has(i.id)),
            ]
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

  // 自动同步到 GitHub（仅在用户操作触发时）
  useEffect(() => {
    if (!needsSync.current || !isGitHubConfigured()) return
    needsSync.current = false
    setSyncing(true)
    const currentIdeas = loadFromLocal()
    saveIdeasToGitHub(currentIdeas)
      .then(() => setSyncError(null))
      .catch((err: any) => setSyncError(err.message))
      .finally(() => setSyncing(false))
  }, [ideas])

  // 添加灵感（函数式更新，无 stale closure）
  const addIdea = useCallback((content: string, tags: string[] = []) => {
    const now = new Date().toISOString()
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

    setIdeas(prev => {
      const updated = [newIdea, ...prev]
      saveToLocal(updated)
      return updated
    })
    needsSync.current = true
    return newIdea
  }, [])

  // 更新灵感
  const updateIdea = useCallback((id: string, updates: Partial<Idea>) => {
    setIdeas(prev => {
      const updated = prev.map(idea =>
        idea.id === id
          ? { ...idea, ...updates, updatedAt: new Date().toISOString() }
          : idea
      )
      saveToLocal(updated)
      return updated
    })
    needsSync.current = true
  }, [])

  // 删除灵感
  const deleteIdea = useCallback((id: string) => {
    setIdeas(prev => {
      const updated = prev.filter(idea => idea.id !== id)
      saveToLocal(updated)
      return updated
    })
    needsSync.current = true
  }, [])

  // 切换收藏
  const toggleFavorite = useCallback((id: string) => {
    setIdeas(prev => {
      const updated = prev.map(idea =>
        idea.id === id ? { ...idea, isFavorite: !idea.isFavorite } : idea
      )
      saveToLocal(updated)
      return updated
    })
    needsSync.current = true
  }, [])

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
      needsSync.current = false
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
