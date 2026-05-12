import swaggerJsdoc from 'swagger-jsdoc'
import config from './index'

/**
 * Swagger / OpenAPI 配置
 * 接口文档地址: http://localhost:3000/api-docs
 */
const swaggerDefinition: swaggerJsdoc.Options['definition'] = {
  openapi: '3.0.0',
  info: {
    title: '健雄书院 — 学生成果展示平台 API',
    version: '1.0.0',
    description: `
## 概述
健雄书院学生成果展示平台后端 API 文档。

## 认证方式
- 使用 JWT Bearer Token 进行身份认证
- 登录后获取 token，在请求头中携带 \`Authorization: Bearer <token>\`

## 响应格式
所有接口统一返回 JSON 格式：
\`\`\`json
{
  "code": 0,        // 业务状态码（0 表示成功）
  "message": "ok",  // 提示信息
  "data": {}        // 响应数据
}
\`\`\`

## 错误码说明
| 状态码 | 业务码 | 说明 |
|--------|--------|------|
| 200 | 0 | 请求成功 |
| 400 | 40000 | 通用请求失败 |
| 400 | 40001 | 参数校验失败 |
| 400 | 40003 | 不支持的文件类型 |
| 401 | 40100 | 缺少认证凭证 |
| 401 | 40101 | 无效的认证凭证 |
| 401 | 40102 | 认证已过期 |
| 403 | 40300 | 权限不足 |
| 404 | 40400 | 资源不存在 |
| 409 | 40002 | 数据重复 |
| 500 | 50000 | 服务器内部错误 |
    `.trim(),
    contact: {
      name: '健雄书院',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: '开发环境',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '输入 JWT Token（不含 Bearer 前缀）',
      },
    },
    schemas: {
      // ==================== 通用响应 ====================
      ApiResponse: {
        type: 'object',
        properties: {
          code: { type: 'integer', description: '业务状态码，0 表示成功' },
          message: { type: 'string', description: '提示信息' },
          data: { type: 'object', nullable: true, description: '响应数据' },
        },
      },
      PaginatedData: {
        type: 'object',
        properties: {
          list: { type: 'array', items: { type: 'object' }, description: '数据列表' },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              pageSize: { type: 'integer', example: 10 },
              total: { type: 'integer', example: 42 },
              totalPages: { type: 'integer', example: 5 },
            },
          },
        },
      },

      // ==================== 用户相关 ====================
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '用户 ID' },
          nickName: { type: 'string', description: '微信昵称' },
          avatarUrl: { type: 'string', description: '头像 URL' },
          role: { type: 'string', enum: ['student', 'admin'], description: '角色' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT Token（有效期 7 天）' },
          openid: { type: 'string', description: '微信 openid' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              nickName: { type: 'string' },
              avatarUrl: { type: 'string' },
            },
          },
        },
      },
      UserProfileResponse: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nickName: { type: 'string' },
          avatarUrl: { type: 'string' },
          signature: { type: 'string', description: '用户签名' },
          birthday: { type: 'string', description: '生日' },
          region: { type: 'array', items: { type: 'string' }, description: '地域' },
          interests: { type: 'array', items: { type: 'string' }, description: '兴趣标签' },
          role: { type: 'string', enum: ['student', 'admin'] },
          createdAt: { type: 'string', format: 'date-time' },
          stats: { $ref: '#/components/schemas/UserStats' },
        },
      },
      UserStats: {
        type: 'object',
        properties: {
          publishCount: { type: 'integer', description: '发布作品数' },
          likeCount: { type: 'integer', description: '获赞总数' },
          viewCount: { type: 'integer', description: '浏览总数' },
        },
      },

      // ==================== 作品相关 ====================
      Work: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: '作品 ID' },
          id: { type: 'string', description: '作品 ID（toJSON 转换后）' },
          userId: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              nickName: { type: 'string' },
              avatarUrl: { type: 'string' },
            },
            description: '发布者信息（populate 后）',
          },
          title: { type: 'string', description: '作品标题', maxLength: 100 },
          description: { type: 'string', description: '作品描述', maxLength: 2000 },
          type: { type: 'string', enum: ['video', 'audio', 'image', 'doc', 'unknown'], description: '作品类型' },
          categoryId: { type: 'string', description: '分类 ID' },
          fileUrl: { type: 'string', description: '文件 URL' },
          cover: { type: 'string', description: '封面 URL' },
          imageList: { type: 'array', items: { type: 'string' }, description: '图片列表' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签列表' },
          isBanner: { type: 'boolean', description: '是否为 Banner 推荐' },
          views: { type: 'integer', description: '浏览量' },
          likesCount: { type: 'integer', description: '点赞数' },
          status: { type: 'string', enum: ['draft', 'published', 'hidden'], description: '状态' },
          isLiked: { type: 'boolean', description: '当前用户是否已点赞（需登录时返回）' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateWorkInput: {
        type: 'object',
        required: ['title', 'type', 'categoryId'],
        properties: {
          title: { type: 'string', maxLength: 100, description: '作品标题（必填）' },
          type: { type: 'string', enum: ['video', 'audio', 'image', 'doc', 'unknown'], description: '作品类型（必填）' },
          categoryId: { type: 'string', description: '分类 ID（必填）' },
          description: { type: 'string', maxLength: 2000, description: '作品描述' },
          fileUrl: { type: 'string', description: '文件 URL' },
          cover: { type: 'string', description: '封面 URL' },
          imageList: { type: 'array', items: { type: 'string' }, description: '图片列表' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签' },
        },
      },
      UpdateWorkInput: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 100, description: '作品标题' },
          type: { type: 'string', enum: ['video', 'audio', 'image', 'doc', 'unknown'], description: '作品类型' },
          categoryId: { type: 'string', description: '分类 ID' },
          description: { type: 'string', maxLength: 2000, description: '作品描述' },
          fileUrl: { type: 'string', description: '文件 URL' },
          cover: { type: 'string', description: '封面 URL' },
          imageList: { type: 'array', items: { type: 'string' }, description: '图片列表' },
          tags: { type: 'array', items: { type: 'string' }, description: '标签' },
          status: { type: 'string', enum: ['draft', 'published', 'hidden'], description: '状态' },
        },
      },
      ToggleLikeResponse: {
        type: 'object',
        properties: {
          liked: { type: 'boolean', description: '点赞后为 true，取消后为 false' },
          likesCount: { type: 'integer', description: '最新点赞数' },
        },
      },
      WorkIdResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', description: '作品 ID' },
        },
      },

      // ==================== 上传相关 ====================
      UploadResponse: {
        type: 'object',
        properties: {
          url: { type: 'string', description: '文件访问 URL' },
          filename: { type: 'string', description: '文件名' },
          size: { type: 'integer', description: '文件大小（字节）' },
          mimetype: { type: 'string', description: '文件 MIME 类型' },
        },
      },
      UploadAvatarResponse: {
        type: 'object',
        properties: {
          avatarUrl: { type: 'string', description: '头像 URL' },
        },
      },

      // ==================== 错误 ====================
      ErrorResponse: {
        type: 'object',
        properties: {
          code: { type: 'integer', description: '业务错误码' },
          message: { type: 'string', description: '错误信息' },
          data: { type: 'null', nullable: true },
        },
      },
    },
  },
  paths: {
    // ==================== 健康检查 ====================
    '/health': {
      get: {
        tags: ['系统'],
        summary: '健康检查',
        description: '服务是否正常运行',
        responses: {
          '200': {
            description: '服务正常',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==================== 认证 ====================
    '/api/auth/login': {
      post: {
        tags: ['认证'],
        summary: '微信登录',
        description: '使用微信小程序的 code 换取 JWT Token，首次登录自动注册',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: {
                  code: { type: 'string', description: 'wx.login() 获取的临时 code' },
                },
              },
              example: { code: '071x1A0w3s5FSI2Lzq1w3nqVcD3x1A0N' },
            },
          },
        },
        responses: {
          '200': {
            description: '登录成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: '登录成功' },
                    data: { $ref: '#/components/schemas/LoginResponse' },
                  },
                },
              },
            },
          },
          '400': {
            description: '参数错误',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/auth/verify': {
      get: {
        tags: ['认证'],
        summary: '校验 Token',
        description: '验证当前 Token 是否有效，并返回用户基本信息',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token 有效',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: 'ok' },
                    data: {
                      type: 'object',
                      properties: {
                        valid: { type: 'boolean', example: true },
                        user: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            nickName: { type: 'string' },
                            avatarUrl: { type: 'string' },
                            role: { type: 'string', enum: ['student', 'admin'] },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Token 无效或过期',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },

    // ==================== 用户 ====================
    '/api/user/profile': {
      get: {
        tags: ['用户'],
        summary: '获取个人资料',
        description: '获取当前登录用户的个人信息 + 统计数据',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: 'ok' },
                    data: { $ref: '#/components/schemas/UserProfileResponse' },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['用户'],
        summary: '更新个人资料',
        description: '更新当前登录用户的昵称或头像',
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateWorkInput' },
              example: { nickName: '张三', avatarUrl: 'https://example.com/avatar.jpg' },
            },
          },
        },
        responses: {
          '200': {
            description: '更新成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: '更新成功' },
                    data: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        nickName: { type: 'string' },
                        avatarUrl: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/user/stats': {
      get: {
        tags: ['用户'],
        summary: '获取用户统计',
        description: '获取当前登录用户的发布数、获赞数、浏览数',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: 'ok' },
                    data: { $ref: '#/components/schemas/UserStats' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==================== 作品 ====================
    '/api/works': {
      get: {
        tags: ['作品'],
        summary: '作品列表',
        description: '分页获取作品列表，支持分类筛选和关键词搜索。可选传入 Token 获取"是否已点赞"状态',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: '分类 ID（不传或 all 表示全部）', example: 'video' },
          { name: 'keyword', in: 'query', schema: { type: 'string' }, description: '搜索关键词（匹配标题/描述/标签）', example: '支教' },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: '页码' },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 }, description: '每页数量' },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: 'ok' },
                    data: {
                      type: 'object',
                      properties: {
                        list: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Work' },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer', example: 1 },
                            pageSize: { type: 'integer', example: 10 },
                            total: { type: 'integer', example: 42 },
                            totalPages: { type: 'integer', example: 5 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['作品'],
        summary: '发布作品',
        description: '创建一个新作品（需登录）',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWorkInput' },
              example: {
                title: '我的暑期支教日记',
                type: 'video',
                categoryId: 'social_practice',
                description: '记录在山区支教的美好时光',
                tags: ['支教', '公益', '暑期实践'],
                fileUrl: 'https://example.com/video.mp4',
              },
            },
          },
        },
        responses: {
          '201': {
            description: '发布成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: '创建成功' },
                    data: { $ref: '#/components/schemas/WorkIdResponse' },
                  },
                },
              },
            },
          },
          '400': {
            description: '参数校验失败',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/works/banner': {
      get: {
        tags: ['作品'],
        summary: 'Banner 推荐',
        description: '获取标记为 Banner 推荐的作品列表（首页轮播用）',
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: 'ok' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Work' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/works/{id}': {
      get: {
        tags: ['作品'],
        summary: '作品详情',
        description: '获取单个作品的详细信息。可选传入 Token 获取"是否已点赞"状态',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: '作品 ID', example: '507f1f77bcf86cd799439011' },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: 'ok' },
                    data: { $ref: '#/components/schemas/Work' },
                  },
                },
              },
            },
          },
          '404': {
            description: '作品不存在',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      put: {
        tags: ['作品'],
        summary: '编辑作品',
        description: '编辑自己的作品（只能编辑自己发布的）',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: '作品 ID' },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateWorkInput' },
              example: { title: '更新后的标题', status: 'published' },
            },
          },
        },
        responses: {
          '200': {
            description: '更新成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: '更新成功' },
                    data: { $ref: '#/components/schemas/WorkIdResponse' },
                  },
                },
              },
            },
          },
          '403': {
            description: '无权限（非本人作品）',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
      delete: {
        tags: ['作品'],
        summary: '删除作品',
        description: '删除自己的作品（只能删除自己发布的）',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: '作品 ID' },
        ],
        responses: {
          '200': {
            description: '删除成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: '删除成功' },
                    data: { type: 'null', example: null },
                  },
                },
              },
            },
          },
          '403': {
            description: '无权限（非本人作品）',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/works/{id}/like': {
      post: {
        tags: ['作品'],
        summary: '点赞/取消点赞',
        description: '对作品进行 toggle 点赞。已点赞则取消，未点赞则点赞',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: '作品 ID' },
        ],
        responses: {
          '200': {
            description: '操作成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: '点赞成功' },
                    data: { $ref: '#/components/schemas/ToggleLikeResponse' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/works/{id}/view': {
      post: {
        tags: ['作品'],
        summary: '记录浏览',
        description: '增加作品的浏览量计数（无需登录）',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: '作品 ID' },
        ],
        responses: {
          '200': {
            description: '记录成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: 'ok' },
                    data: { type: 'null', example: null },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/works/my/list': {
      get: {
        tags: ['作品'],
        summary: '我的作品列表',
        description: '获取当前用户发布的作品列表（含草稿和已隐藏）',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: '页码' },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 }, description: '每页数量' },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: 'ok' },
                    data: { $ref: '#/components/schemas/PaginatedData' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/works/liked/list': {
      get: {
        tags: ['作品'],
        summary: '我点赞的作品列表',
        description: '获取当前用户点赞过的作品列表',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: '页码' },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 }, description: '每页数量' },
        ],
        responses: {
          '200': {
            description: '成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: 'ok' },
                    data: { $ref: '#/components/schemas/PaginatedData' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ==================== 上传 ====================
    '/api/upload': {
      post: {
        tags: ['上传'],
        summary: '上传文件',
        description: '通用文件上传（支持图片/视频/音频/文档）。根据 COS 配置自动选择云端或本地存储',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: '文件（支持 jpg/png/gif/webp/mp4/mov/mp3/wav/pdf/doc/docx，最大 50MB）',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '上传成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: '上传成功' },
                    data: { $ref: '#/components/schemas/UploadResponse' },
                  },
                },
              },
            },
          },
          '400': {
            description: '文件类型不支持或超出大小限制',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
          },
        },
      },
    },
    '/api/upload/avatar': {
      post: {
        tags: ['上传'],
        summary: '上传头像',
        description: '上传用户头像图片，返回头像 URL',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: '头像图片（支持 jpg/png/gif/webp）',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: '上传成功',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    message: { type: 'string', example: '头像上传成功' },
                    data: { $ref: '#/components/schemas/UploadAvatarResponse' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [], // 使用 definition 内联定义，不扫描文件
}

export const swaggerSpec = swaggerJsdoc(options)
