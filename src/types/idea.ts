// Project Aurora - 灵感数据模型

export interface Idea {
  id: string
  title: string
  content: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  tags: string[]
  isFavorite: boolean
}

export interface AuroraConfig {
  githubToken: string
  githubRepo: string // e.g. "username/aurora-data"
  githubBranch: string // default: "main"
}
