// SettingsPanel - GitHub 配置面板

import { useState } from 'react'
import type { AuroraConfig } from '@/types/idea'
import { saveConfig, validateGitHubToken, ensureRepoExists } from '@/lib/github'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Settings, Link, CheckCircle2, AlertCircle } from 'lucide-react'

interface SettingsPanelProps {
  onClose: () => void
  onConfigured: () => void
}

export function SettingsPanel({ onClose, onConfigured }: SettingsPanelProps) {
  const existingConfig = localStorage.getItem('aurora-config')
  const parsed = existingConfig ? JSON.parse(existingConfig) : null

  const [token, setToken] = useState(parsed?.githubToken || '')
  const [repo, setRepo] = useState(parsed?.githubRepo || '')
  const [branch, setBranch] = useState(parsed?.githubBranch || 'main')
  const [validating, setValidating] = useState(false)
  const [validResult, setValidResult] = useState<{ valid: boolean; username: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleValidate = async () => {
    if (!token) return
    setValidating(true)
    setError(null)
    try {
      const result = await validateGitHubToken(token)
      setValidResult(result)
      if (!result.valid) {
        setError('Token 无效，请检查后重试')
      }
      // 自动填充仓库名称
      if (result.valid && !repo) {
        setRepo(`${result.username}/aurora-data`)
      }
    } catch {
      setError('验证失败，请检查网络连接')
    } finally {
      setValidating(false)
    }
  }

  const handleSave = async () => {
    if (!token || !repo) {
      setError('请填写 Token 和仓库地址')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const config: AuroraConfig = { githubToken: token, githubRepo: repo, githubBranch: branch }
      saveConfig(config)
      // 确保仓库存在
      await ensureRepoExists()
      onConfigured()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="aurora-settings-overlay">
      <Card className="aurora-settings-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              GitHub 云同步设置
            </CardTitle>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Personal Access Token</label>
            <Input
              type="password"
              value={token}
              onChange={e => { setToken(e.target.value); setValidResult(null) }}
              placeholder="ghp_xxxxxxxxxxxx"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleValidate}
              disabled={validating || !token}
              className="w-full"
            >
              {validating ? '验证中...' : '验证 Token'}
            </Button>
            {validResult?.valid && (
              <div className="flex items-center gap-1 text-sm text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                Token 有效，用户: {validResult.username}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">仓库地址</label>
            <Input
              value={repo}
              onChange={e => setRepo(e.target.value)}
              placeholder="username/aurora-data"
            />
            <p className="text-xs text-muted-foreground">
              格式: 用户名/仓库名。首次配置会自动创建私有仓库。
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">分支</label>
            <Input
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="main"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !token || !repo}
            className="w-full aurora-btn-primary"
          >
            {saving ? '保存中...' : (
              <span className="flex items-center gap-1">
                <Link className="h-4 w-4" /> 连接 GitHub
              </span>
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center">
            数据将存储在 GitHub 私有仓库中，仅你本人可访问
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
