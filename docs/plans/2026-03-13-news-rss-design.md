# News 模块 RSS 订阅与审核系统设计

**日期**: 2026-03-13

## 需求概述

1. News 模块接入 RSS Hub 订阅源，支持自动化抓取和手动添加
2. 人工审核机制：RSS 自动抓取 → 待审核列表 → 人工审核通过 → 显示
3. 按内容类型分类 (Articles/Podcasts/Twitters/Videos)
4. 首页展示热门推荐，按分类显示，超出数量按审核时间排序

## 数据模型

### RSS 源表 (rss_sources)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| name | string | 源名称 |
| url | string | RSS URL |
| category | enum | Articles/Podcasts/Twitters/Videos |
| enabled | boolean | 是否启用 |
| created_at | datetime | 创建时间 |

### 内容表 (news_items)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识 |
| source_id | string | RSS 源 ID |
| title | string | 标题 |
| summary | string | 摘要 |
| content | text | 完整内容(可选) |
| url | string | 原文链接 |
| image_url | string | 封面图 |
| author | string | 作者 |
| published_at | datetime | 发布时间 |
| status | enum | pending/approved/rejected |
| is_featured | boolean | 是否热门 |
| approved_at | datetime | 审核时间 |
| created_at | datetime | 创建时间 |

## 页面结构

### 1. /news - 分类展示页
- 分类筛选 (All/Articles/Podcasts/Twitters/Videos)
- 列表展示 (支持分页)
- 热门标记展示

### 2. /admin/news - 审核管理页
- 待审核列表
- 批量审核 (通过/拒绝)
- 标记热门
- RSS 源管理 (导入 OPML/手动添加)

### 3. 首页 - 热门推荐
- 按分类各显示 N 条热门
- 超出部分按最新审核时间排序

## 技术实现

### 数据存储
- 使用 SQLite 本地数据库 (通过 better-sqlite3)
- 数据库文件位置: `data/news.db`

### RSS 抓取
- 支持解析 RSS 2.0 和 Atom 格式
- 定时任务通过 Vercel Cron 或 手动 API 触发

### OPML 导入
- 解析 OPML 文件批量导入 RSS 源
- 支持从 BestBlogs 项目目录导入
