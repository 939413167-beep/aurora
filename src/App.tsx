// Project Aurora - AI驱动的第二大脑

import { useState, useRef, useEffect } from 'react'
import { useIdeas } from '@/hooks/useIdeas'
import { IdeaCard } from '@/components/IdeaCard'
import { SettingsPanel } from '@/components/SettingsPanel'
import { isGitHubConfigured } from '@/lib/github'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Sparkles,
  RefreshCw,
  CloudOff,
  Cloud,
  Search,
  Filter,
  Star,
  Tag,
} from 'lucide-react'

function App() {
  const { ideas, syncing, syncError, addIdea, updateIdea, deleteIdea, toggleFavorite, pullFromGitHub } = useIdeas()
  const [showSettings, setShowSettings] = useState(false)
  const [inputContent, setInputContent] = useState('')
  const [inputTags, setInputTags] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFavorite, setFilterFavorite] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const githubConfigured = isGitHubConfigured()

  // 首次进入聚焦输入框
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // 保存灵感
  const handleSave = () => {
    if (!inputContent.trim()) return
    const tags = inputTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
    addIdea(inputContent, tags)
    setInputContent('')
    setInputTags('')
    setShowTagInput(false)
    textareaRef.current?.focus()
  }

  // 快捷键保存 (Ctrl+Enter / Cmd+Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
  }

  // 过滤灵感列表
  const filteredIdeas = ideas.filter(idea => {
    if (filterFavorite && !idea.isFavorite) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        idea.title.toLowerCase().includes(q) ||
        idea.content.toLowerCase().includes(q) ||
        idea.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  // 收藏的灵感
  const favoriteCount = ideas.filter(i => i.isFavorite).length

  return (
    <div className="aurora-app">
      {/* 顶部栏 */}
      <header className="aurora-header">
        <div className="aurora-header-left">
          <Sparkles className="h-6 w-6 text-aurora-glow" />
          <h1 className="aurora-logo">Aurora</h1>
          <span className="aurora-subtitle">灵感 · 捕获 · 成长</span>
        </div>
        <div className="aurora-header-right">
          {githubConfigured ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={pullFromGitHub}
              disabled={syncing}
              className="aurora-sync-btn"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <Cloud className="h-4 w-4 text-green-500" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowSettings(true)}
              className="aurora-sync-btn text-muted-foreground"
            >
              <CloudOff className="h-4 w-4" />
              <span className="text-xs">未连接</span>
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowSettings(true)}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {syncError && (
        <div className="aurora-sync-error">
          云同步失败: {syncError}
        </div>
      )}

      {/* 灵感捕获区 */}
      <section className="aurora-capture">
        <div className="aurora-capture-inner">
          <Textarea
            ref={textareaRef}
            value={inputContent}
            onChange={e => setInputContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="今天有什么新的想法？"
            className="aurora-input"
            rows={3}
          />

          {/* 标签输入（可选展开） */}
          {showTagInput ? (
            <div className="aurora-tag-input">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <Input
                value={inputTags}
                onChange={e => setInputTags(e.target.value)}
                placeholder="标签（逗号分隔）"
                className="aurora-tag-field"
              />
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowTagInput(true)}
              className="aurora-tag-toggle text-muted-foreground"
            >
              <Tag className="h-3 w-3" /> 添加标签
            </Button>
          )}

          <div className="aurora-save-row">
            <Button
              onClick={handleSave}
              disabled={!inputContent.trim()}
              className="aurora-btn-save"
            >
              保存
            </Button>
            <span className="text-xs text-muted-foreground aurora-shortcut-hint">
              Ctrl+Enter 快捷保存
            </span>
          </div>
        </div>
      </section>

      {/* 灵感列表 */}
      <section className="aurora-list">
        {/* 筛选栏 */}
        {ideas.length > 0 && (
          <div className="aurora-filter-bar">
            <div className="aurora-search">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索灵感..."
                className="aurora-search-input"
              />
            </div>
            <Button
              size="sm"
              variant={filterFavorite ? 'default' : 'outline'}
              onClick={() => setFilterFavorite(!filterFavorite)}
              className="aurora-filter-btn"
            >
              <Star className="h-3 w-3" />
              收藏 {favoriteCount > 0 && `(${favoriteCount})`}
            </Button>
          </div>
        )}

        {/* 空状态 */}
        {filteredIdeas.length === 0 && ideas.length === 0 && (
          <div className="aurora-empty">
            <Sparkles className="h-12 w-12 text-aurora-glow opacity-50" />
            <p className="text-muted-foreground mt-3">灵感像极光一样突然出现</p>
            <p className="text-xs text-muted-foreground mt-1">记下来，它就不会消失</p>
          </div>
        )}

        {filteredIdeas.length === 0 && ideas.length > 0 && (
          <div className="aurora-empty">
            <Filter className="h-8 w-8 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mt-2">没有匹配的灵感</p>
          </div>
        )}

        {/* 灵感卡片列表 */}
        <div className="aurora-cards">
          {filteredIdeas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onUpdate={updateIdea}
              onDelete={deleteIdea}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      </section>

      {/* 设置面板 */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onConfigured={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

export default App
