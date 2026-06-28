// IdeaCard - 灵感卡片组件

import { useState } from 'react'
import type { Idea } from '@/types/idea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Star,
  Pencil,
  Trash2,
  X,
  Check,
  Tag,
} from 'lucide-react'

interface IdeaCardProps {
  idea: Idea
  onUpdate: (id: string, updates: Partial<Idea>) => void
  onDelete: (id: string) => void
  onToggleFavorite: (id: string) => void
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function IdeaCard({ idea, onUpdate, onDelete, onToggleFavorite }: IdeaCardProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(idea.title)
  const [editContent, setEditContent] = useState(idea.content)
  const [editTags, setEditTags] = useState(idea.tags.join(', '))
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSaveEdit = () => {
    const tags = editTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
    onUpdate(idea.id, {
      title: editTitle,
      content: editContent,
      tags,
    })
    setEditing(false)
  }

  const handleCancelEdit = () => {
    setEditTitle(idea.title)
    setEditContent(idea.content)
    setEditTags(idea.tags.join(', '))
    setEditing(false)
  }

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(idea.id)
    } else {
      setShowDeleteConfirm(true)
      // 3秒后自动取消确认状态
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }

  if (editing) {
    return (
      <Card className="aurora-card editing">
        <CardHeader className="pb-3">
          <Input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder="标题"
            className="text-lg font-semibold"
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="内容"
            rows={4}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <Input
              value={editTags}
              onChange={e => setEditTags(e.target.value)}
              placeholder="标签（逗号分隔）"
              className="text-sm"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSaveEdit} className="aurora-btn-primary">
              <Check className="h-4 w-4 mr-1" /> 保存
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancelEdit}>
              <X className="h-4 w-4 mr-1" /> 取消
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`aurora-card ${idea.isFavorite ? 'favorite' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-snug aurora-card-title">
            {idea.title}
          </CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onToggleFavorite(idea.id)}
              className={`h-8 w-8 ${idea.isFavorite ? 'text-amber-400' : 'text-muted-foreground'}`}
            >
              <Star className={`h-4 w-4 ${idea.isFavorite ? 'fill-amber-400' : ''}`} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setEditing(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDelete}
              className={`h-8 w-8 ${showDeleteConfirm ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap aurora-card-content">
          {idea.content}
        </p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {idea.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="aurora-tag">
              {tag}
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground ml-auto">
            {formatTime(idea.createdAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
