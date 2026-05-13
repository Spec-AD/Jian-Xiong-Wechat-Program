# 健雄书院 · 后端开发计划

> 项目：南京大学健雄书院 — 学生成果展示平台
> 基于前端 `miniprogram/` 代码需求，从零搭建后端服务

---

## 目录

1. [技术选型建议](#1-技术选型建议)
2. [项目结构规划](#2-项目结构规划)
3. [数据库设计](#3-数据库设计)
4. [API 接口清单](#4-api-接口清单)
5. [开发阶段规划](#5-开发阶段规划)
6. [前端对接说明](#6-前端对接说明)
7. [部署与运维](#7-部署与运维)

---

## 1. 技术选型建议

| 层级 | 推荐方案 | 备选方案 |
|------|---------|---------|
| **语言** | **Node.js (TypeScript)** ✅ | Python (FastAPI) |
| **框架** | **Express.js** ✅ | Koa2 / FastAPI |
| **数据库** | **MongoDB 7.0** ✅ | MySQL (备选) |
| **ODM** | **Mongoose 8.x** ✅ | Prisma (MongoDB模式) |
| **缓存** | Redis（可选，后续按需引入） | — |
| **文件存储** | **腾讯云 COS** ✅ | 阿里云 OSS / 七牛云 |
| **接口文档** | Swagger / Apifox | YApi |
| **部署** | **Docker + Nginx + PM2** ✅ | 云服务器直接部署 |

> ✅ **已确认技术栈：** Node.js + TypeScript / Express.js / MongoDB + Mongoose / 腾讯云 COS / JWT / Docker + Nginx + PM2
>
> **选型说明：**
> - **MongoDB** — 作品数据天然包含数组（tags、image_list）、嵌套结构，文档模型比关系型表更匹配；业务迭代中字段可能频繁增减，MongoDB 的灵活 Schema 无需每次改表都跑 migration
> - **Mongoose** — MongoDB 官方推荐的 Node.js ODM，提供 Schema 校验、populate 关联查询、中间件等能力
> - **腾讯云 COS** — 与微信小程序生态无缝对接，前端直传或后端代理上传均可

---

## 2. 项目结构规划

```
server/                          # 后端项目根目录
├── src/
│   ├── app.ts                   # Express 入口
│   ├── config/
│   │   ├── index.ts             # 全局配置（端口、数据库、COS等）
│   │   └── db.ts                # MongoDB 连接配置
│   ├── middleware/
│   │   ├── auth.ts              # JWT/微信登录鉴权中间件
│   │   ├── errorHandler.ts      # 统一错误处理
│   │   └── logger.ts            # 请求日志
│   ├── routes/
│   │   ├── index.ts             # 路由汇总
│   │   ├── auth.routes.ts       # 登录认证路由
│   │   ├── user.routes.ts       # 用户信息路由
│   │   ├── work.routes.ts       # 作品路由
│   │   └── upload.routes.ts     # 文件上传路由
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── work.controller.ts
│   │   └── upload.controller.ts
│   ├── services/
│   │   ├── auth.service.ts      # 微信登录逻辑
│   │   ├── user.service.ts
│   │   ├── work.service.ts
│   │   └── upload.service.ts    # COS 文件上传
│   ├── models/
│   │   ├── user.model.ts        # 用户模型
│   │   ├── work.model.ts        # 作品模型
│   │   └── like.model.ts        # 点赞关系模型
│   ├── validators/
│   │   ├── auth.validator.ts    # 请求参数校验
│   │   ├── work.validator.ts
│   │   └── user.validator.ts
│   ├── utils/
│   │   ├── response.ts          # 统一响应格式
│   │   ├── jwt.ts               # JWT Token 工具
│   │   └── wx.ts                # 微信 API 调用封装
│   └── types/
│       └── index.ts             # 类型定义
├── uploads/                     # 本地开发临时文件
├── .env                         # 环境变量（不提交 Git）
├── .env.example                 # 环境变量模板
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## 3. 数据库设计（MongoDB）

> 使用 3 个 Collection：`users`、`works`、`likes`，通过 `_id` 和引用（Reference）关联。
> 所有 Collection 统一使用 MongoDB 内置的 `_id`（ObjectId）作为主键，`createdAt` / `updatedAt` 通过 Mongoose `timestamps: true` 自动管理。

### 3.1 用户集合 `users`

| 字段 | Mongoose 类型 | 说明 |
|------|-------------|------|
| `_id` | ObjectId (自动) | 用户 ID |
| `openid` | String (unique, required) | 微信 openid |
| `nickName` | String (default: '建雄用户_xxxx') | 微信昵称 |
| `avatarUrl` | String (default: '') | 微信头像 URL |
| `role` | String (enum: student\|admin, default: 'student') | 角色 |
| `createdAt` | Date (timestamps) | 创建时间 |
| `updatedAt` | Date (timestamps) | 更新时间 |
| `lastLoginAt` | Date | 最后登录时间 |

**索引：** `openid` 上建 **唯一索引**

**Mongoose Schema 示例：**

```typescript
const userSchema = new Schema({
  openid:      { type: String, required: true, unique: true },
  nickName:    { type: String, default: '' },
  avatarUrl:   { type: String, default: '' },
  role:        { type: String, enum: ['student', 'admin'], default: 'student' },
  lastLoginAt: { type: Date },
}, { timestamps: true })
```

### 3.2 作品集合 `works`

| 字段 | Mongoose 类型 | 说明 |
|------|-------------|------|
| `_id` | ObjectId (自动) | 作品 ID |
| `userId` | ObjectId (ref: 'User', required) | 发布者（引用 users） |
| `title` | String (required) | 作品标题 |
| `description` | String | 作品描述 |
| `type` | String (enum: video\|audio\|image\|doc\|unknown) | 文件类型 |
| `categoryId` | String | 分类ID（对应前端 WORK_CATEGORIES） |
| `fileUrl` | String | 主文件 URL（COS 地址） |
| `cover` | String | 封面图 URL（COS 地址） |
| `imageList` | [String] | 多图时的图片列表 |
| `tags` | [String] | 标签数组 |
| `isBanner` | Boolean (default: false) | 是否推荐到 Banner |
| `views` | Number (default: 0) | 浏览量 |
| `likesCount` | Number (default: 0) | 点赞数（冗余字段，避免实时 COUNT） |
| `status` | String (enum: draft\|published\|hidden, default: 'published') | 状态 |
| `createdAt` | Date (timestamps) | 发布时间 |
| `updatedAt` | Date (timestamps) | 更新时间 |

**索引建议：**
- `userId` — 查询用户的作品列表
- `status` + `createdAt` — 按时间排序查询已发布作品
- `categoryId` + `status` + `createdAt` — 按分类筛选
- `isBanner` + `status` — 查询 Banner 作品
- `title`（文本索引）— 搜索功能

### 3.3 点赞关系集合 `likes`

| 字段 | Mongoose 类型 | 说明 |
|------|-------------|------|
| `_id` | ObjectId (自动) | 记录 ID |
| `userId` | ObjectId (ref: 'User', required) | 点赞用户 |
| `workId` | ObjectId (ref: 'Work', required) | 被点赞作品 |
| `createdAt` | Date (timestamps) | 点赞时间 |

**索引：** `{ userId: 1, workId: 1 }` 上建 **复合唯一索引**（确保一用户对一作品只能点赞一次）
`{ workId: 1 }` — 查询作品的点赞列表 |
`{ userId: 1 }` — 查询用户的点赞列表

### 3.4 关联关系图

```
┌──────────────────┐
│     users        │
│ ─────────────── │
│ _id (PK)        │──┐
│ openid (unique) │  │
│ nickName        │  │
│ avatarUrl       │  │
│ role            │  │
└──────────────────┘  │
                      │
┌──────────────────┐  │
│     works        │  │
│ ─────────────── │  │
│ _id (PK)        │  │
│ userId ─────────┼──┘  (ref → users._id)
│ title           │
│ type            │      ┌──────────────────┐
│ categoryId      │      │     likes        │
│ isBanner        │      │ ─────────────── │
│ views           │      │ _id (PK)        │
│ likesCount      │      │ userId ─────────┼──→ users._id
│ status          │      │ workId ─────────┼──→ works._id
│ createdAt       │      │ createdAt       │
└──────────────────┘      └──────────────────┘
```

### 3.5 关键查询模式示例

```typescript
// 1. 作品列表（分页 + 分类筛选 + 作者填充）
Work.find({ status: 'published', ...(categoryId && categoryId !== 'all' ? { categoryId } : {}) })
  .sort({ createdAt: -1 })
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .populate('userId', 'nickName avatarUrl')

// 2. 查询当前用户是否点赞过某作品（用于 works 列表的 liked 字段）
const likedMap = await Like.find({ userId: currentUserId, workId: { $in: workIds } })
  .then(list => new Map(list.map(l => [l.workId.toString(), true])))

// 3. 点赞 toggle
const existing = await Like.findOne({ userId, workId })
if (existing) {
  await Like.deleteOne({ _id: existing._id })
  await Work.findByIdAndUpdate(workId, { $inc: { likesCount: -1 } })
} else {
  await Like.create({ userId, workId })
  await Work.findByIdAndUpdate(workId, { $inc: { likesCount: 1 } })
}

// 4. 用户统计数据
const publishCount = await Work.countDocuments({ userId, status: 'published' })
const likeCount = await Like.countDocuments({ userId })
const viewCount = await Work.aggregate([
  { $match: { userId } },
  { $group: { _id: null, total: { $sum: "$views" } } }
])
```

---

## 4. API 接口清单

> 基础路径：`https://your-server.com/api`
> 统一响应格式见下方约定

### 4.1 统一响应格式

```json
// 成功
{ "code": 0, "message": "ok", "data": { ... } }

// 失败
{ "code": 40001, "message": "参数错误", "data": null }
```

### 4.2 认证相关

| 方法 | 路径 | 说明 | 登录态 | 对应前端 |
|------|------|------|--------|---------|
| POST | `/auth/login` | 微信 code 换取 openid，返回 token | ❌ | `app.ts` onLaunch |
| GET | `/auth/verify` | 校验 token 有效性 | ✅ | — |

**请求示例 — `POST /auth/login`**
```json
// Request
{ "code": "wx_login_code_xxx" }

// Response
{
  "code": 0,
  "data": {
    "token": "jwt_token_string",
    "openid": "oXXXXX",
    "user": {
      "id": "664f1a2b3c4d5e6f7a8b9c0d",
      "nickName": "建雄用户_1234",
      "avatarUrl": "https://..."
    }
  }
}
```

### 4.3 用户相关

| 方法 | 路径 | 说明 | 登录态 | 对应前端 |
|------|------|------|--------|---------|
| GET | `/user/profile` | 获取用户个人信息 + 统计 | ✅ | `profile.ts` onShow |
| PUT | `/user/profile` | 更新用户头像/昵称 | ✅ | `index.ts` onLogin |
| GET | `/user/stats` | 获取用户统计数据 | ✅ | `profile.ts` _loadStats |

**响应示例 — `GET /user/profile`**
```json
{
  "code": 0,
  "data": {
    "id": "664f1a2b3c4d5e6f7a8b9c0d",
    "nickName": "张明远",
    "avatarUrl": "https://...",
    "createdAt": "2026-01-15T08:00:00Z",
    "stats": {
      "publishCount": 3,
      "likeCount": 186,
      "viewCount": 1024
    }
  }
}
```

### 4.4 作品相关（核心）

| 方法 | 路径 | 说明 | 登录态 | 对应前端 |
|------|------|------|--------|---------|
| GET | `/works` | 作品列表（分页+筛选） | ❌ | `hall.ts` onLoad |
| GET | `/works/banner` | Banner 推荐作品 | ❌ | `hall.ts` bannerList |
| GET | `/works/:id` | 作品详情 | ❌ | `viewer.ts` onLoad |
| POST | `/works` | 发布作品 | ✅ | 待开发 |
| PUT | `/works/:id` | 编辑作品 | ✅ | 待开发 |
| DELETE | `/works/:id` | 删除作品 | ✅ | 待开发 |
| POST | `/works/:id/like` | 点赞/取消点赞（toggle） | ✅ | `viewer.ts` onLike |
| GET | `/works/my` | 我发布的作品列表 | ✅ | `profile.ts` "我的发布" |
| GET | `/works/liked` | 我点赞的作品列表 | ✅ | `profile.ts` "我的点赞" |
| POST | `/works/:id/view` | 记录浏览量 | ❌ | viewer 访问时调用 |

**请求示例 — `GET /works?category=video&keyword=支教&page=1&pageSize=10`**
```json
// Response
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "664f1a2b3c4d5e6f7a8b9c0d",
        "title": "苏北支教社会实践纪录片",
        "author": "志愿服务队",
        "authorAvatar": "https://...",
        "date": "2026-06-01",
        "cover": "https://...",
        "type": "video",
        "typeName": "视频",
        "typeIcon": "🎬",
        "fileUrl": "https://...",
        "likes": 37,
        "views": 201,
        "categoryId": "video",
        "isBanner": false,
        "description": "暑期赴苏北农村支教...",
        "tags": ["志愿", "支教", "社会实践"],
        "imageList": [],
        "liked": true           // 当前用户是否点赞过
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 6,
      "totalPages": 1
    }
  }
}
```

### 4.5 文件上传

| 方法 | 路径 | 说明 | 登录态 | 对应前端 |
|------|------|------|--------|---------|
| POST | `/upload` | 上传文件（图片/视频/音频/文档） | ✅ | 作品发布时 |
| POST | `/upload/avatar` | 上传头像 | ✅ | `index.ts` onChooseAvatar |

> 文件上传后返回 URL，前端将 URL 存入作品数据中提交

---

## 5. 开发阶段规划

### 阶段一：基础框架 + 登录（预计 3 天）

| 步骤 | 内容 | 产出 |
|------|------|------|
| 1.1 | 初始化 Node.js + TypeScript + Express 项目 | 项目骨架 |
| 1.2 | 连接 MongoDB 数据库，定义 `users` 集合 Model | `config/db.ts` + `models/user.model.ts` |
| 1.3 | 实现微信登录接口 `POST /auth/login` | 对接`app.ts`中的 wx.login TODO |
| 1.4 | 实现 JWT Token 鉴权中间件 | `middleware/auth.ts` |
| 1.5 | 前端接入：替换 `app.ts` 中 TODO 代码 | 登录流程跑通 |
| 1.6 | 实现 `PUT /user/profile` 用户信息绑定 | 对接 `index.ts` onLogin |

**验证标准：** 打开小程序 → 获取 code → 调后端 → 返回 token → 进入大厅页

### 阶段二：作品列表 + 详情（预计 3 天）

| 步骤 | 内容 | 产出 |
|------|------|------|
| 2.1 | 定义 `works` 集合 Model + 初始种子数据脚本 | `models/work.model.ts` + seed 脚本 |
| 2.2 | 实现 `GET /works`（分页+分类+搜索） | 替换 `MOCK_WORKS` |
| 2.3 | 实现 `GET /works/banner` | Banner 轮播数据 |
| 2.4 | 实现 `GET /works/:id` 作品详情 | 作品详情页数据 |
| 2.5 | 前端对接：替换 hall.ts 中的 Mock 数据为 wx.request | 大厅页数据真实 |
| 2.6 | 实现下拉刷新 & 触底分页加载 | `onPullDownRefresh` + `onReachBottom` |

**验证标准：** 大厅页展示真实数据库中的作品数据，分类筛选/搜索/分页正常

### 阶段三：点赞 + 用户统计（预计 2 天）

| 步骤 | 内容 | 产出 |
|------|------|------|
| 3.1 | 定义 `likes` 集合 Model + 复合唯一索引 | `models/like.model.ts` |
| 3.2 | 实现 `POST /works/:id/like`（ toggle 点赞） | 对接 `viewer.ts` onLike |
| 3.3 | 实现 `GET /user/stats` | 对接 `profile.ts` _loadStats |
| 3.4 | 前端对接：替换 viewer.ts + profile.ts 中的 Mock | 点赞/统计真实 |

**验证标准：** 点赞 toggle 生效，用户统计页数据真实

### 阶段四：发布作品 + 文件上传（预计 3 天）

| 步骤 | 内容 | 产出 |
|------|------|------|
| 4.1 | 接入腾讯云 COS SDK | 文件上传能力 |
| 4.2 | 实现 `POST /upload` 通用文件上传接口 | 上传返回 URL |
| 4.3 | 实现 `POST /works` 发布作品接口 | 新增作品 |
| 4.4 | 实现 `PUT /works/:id` + `DELETE /works/:id` | 编辑/删除 |
| 4.5 | 实现 `GET /works/my` + `GET /works/liked` | 对接 "我的发布"/"我的点赞" |
| 4.6 | 前端：实现作品发布页面（新增页面或弹窗） | 发布功能可用 |

**验证标准：** 用户可发布作品（含文件上传），可在"我的"中查看管理

### 阶段五：完善 + 联调（预计 2 天）

| 步骤 | 内容 | 产出 |
|------|------|------|
| 5.1 | 实现浏览量统计 `POST /works/:id/view` | 作品访问计数 |
| 5.2 ✅ | 全局错误处理 + 接口参数校验 | 稳定性提升 |
| 5.3 ✅ | 接口文档生成（Swagger） | ✅ 已完成 — 访问 http://localhost:3000/api-docs |
| 5.4 | 全流程联调测试 | 无 Mock 依赖 |

---

## 6. 前端对接说明

### 6.1 全局配置修改

**文件：`miniprogram/app.ts`**

```typescript
// 修改前
baseUrl: '', // TODO: 替换为实际后端地址

// 修改后
baseUrl: 'https://your-server.com/api',
```

### 6.2 登录流程对接

**文件：`miniprogram/app.ts`** — 替换 onLaunch 中 TODO：

```typescript
wx.login({
  success: res => {
    if (res.code) {
      this.globalData.loginCode = res.code
      // 替换为正式请求
      wx.request({
        url: `${this.globalData.baseUrl}/auth/login`,
        method: 'POST',
        data: { code: res.code },
        success: (r: any) => {
          if (r.data.code === 0) {
            const { token, openid, user } = r.data.data
            this.globalData.openid = openid
            wx.setStorageSync('token', token)  // 存 token
            // 如本地有用户信息，同步到后端
          }
        },
      })
    }
  },
})
```

### 6.3 请求封装建议

建议封装一个统一的 `request` 工具函数，自动携带 token、处理错误：

```typescript
// miniprogram/utils/request.ts
const app = getApp<IAppOption>()

export const request = <T>(options: WechatMiniprogram.RequestOption): Promise<T> => {
  const token = wx.getStorageSync('token')
  return new Promise((resolve, reject) => {
    wx.request({
      ...options,
      url: app.globalData.baseUrl + options.url,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header,
      },
      success: (res) => {
        if (res.data.code === 0) resolve(res.data.data)
        else reject(new Error(res.data.message))
      },
      fail: reject,
    })
  })
}
```

### 6.4 前端文件修改清单

| 文件 | 改动内容 |
|------|---------|
| `miniprogram/app.ts` | 配置 `baseUrl`，实现 `wx.login` → 后端登录 |
| `miniprogram/utils/util.ts` | （新增）封装 `request` 工具函数 |
| `miniprogram/pages/hall/hall.ts` | 替换 `MOCK_WORKS` 为 `request('/works')` |
| `miniprogram/pages/viewer/viewer.ts` | 替换 `onLike` 为调后端接口 |
| `miniprogram/pages/profile/profile.ts` | 替换 `_loadStats` 为调后端接口 |
| `miniprogram/pages/index/index.ts` | `onLogin` 中调后端绑定用户信息 |

---

## 7. 部署与运维

### 7.1 环境要求

- Node.js >= 18 LTS
- MongoDB >= 7.0（建议使用 MongoDB Atlas 云服务或自建副本集）
- Nginx（反向代理 + SSL）
- 腾讯云 COS Bucket（文件存储）

### 7.2 环境变量配置

```bash
# .env 文件
PORT=3000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://localhost:27017/jianxiong
# 或 MongoDB Atlas 连接串：
# MONGODB_URI=mongodb+srv://user:password@cluster.xxxxx.mongodb.net/jianxiong?retryWrites=true&w=majority

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 微信小程序
WX_APPID=wx71377f312ea3f547
WX_SECRET=your_wechat_app_secret

# 腾讯云 COS
COS_SECRET_ID=your_cos_secret_id
COS_SECRET_KEY=your_cos_secret_key
COS_BUCKET=your-bucket
COS_REGION=ap-nanjing
```

### 7.3 部署架构

```
用户 ─→ 微信小程序
         │
         ▼
    ┌─────────────┐
    │  Nginx      │  HTTPS + SSL
    │ 反向代理     │
    └──────┬──────┘
           │
    ┌──────▼──────┐
    │  Node.js    │  PM2 进程管理
    │  Express    │
    └──────┬──────┘
           │
    ┌──────▼──────┐    ┌──────────────┐
    │  MongoDB    │    │  腾讯云 COS  │
    │  数据库     │    │  文件存储     │
    └─────────────┘    └──────────────┘
```

### 7.4 部署命令

```bash
# 1. 安装依赖
npm install

# 2. 编译 TypeScript
npm run build

# 3. 确保 MongoDB 已启动
# 本地：mongod --dbpath /data/db
# 云服务：确认连接串可用

# 4. 运行种子数据（首次需要）
npm run seed

# 5. 使用 PM2 启动
npm install -g pm2
pm2 start dist/app.js --name jianxiong-api
pm2 save
pm2 startup
```

---

## 附录 A：前端 Mock 数据迁移对照表

| Mock 位置 | 替换为 | 对应接口 |
|-----------|--------|---------|
| `hall.ts` → `MOCK_WORKS` | `wx.request` 调用 | `GET /works?page=1&pageSize=20` |
| `hall.ts` → `onPullDownRefresh` 中的 setTimeout | 调接口刷新 | `GET /works?page=1` |
| `hall.ts` → `onReachBottom` 中的 toast | 分页加载 | `GET /works?page=N` |
| `viewer.ts` → `onLike` 中的 toggle | 调后端持久化 | `POST /works/:id/like` |
| `profile.ts` → `_loadStats` 中的 mock 数据 | 调后端获取 | `GET /user/stats` |
| `app.ts` → `wx.login` success 中的 TODO | 调后端登录 | `POST /auth/login` |

### 新增 Swagger 依赖
```json
{
  "dependencies": {
    "swagger-jsdoc": "^6.2.0",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@types/swagger-jsdoc": "^6.0.0",
    "@types/swagger-ui-express": "^4.1.0"
  }
}
```

## 附录 B：关键依赖清单

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^8.0.0",
    "jsonwebtoken": "^9.0.0",
    "cos-nodejs-sdk-v5": "^2.12.0",
    "axios": "^1.6.0",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.3.0",
    "express-validator": "^7.0.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/express": "^4.17.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/multer": "^1.4.0",
    "@types/cors": "^2.8.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0"
  }
}
```

---

> **下一步行动建议：** 确认技术选型后，从阶段一开始搭建项目骨架和登录流程。
