// pages/publish/publish.ts — 发布作品
import { toast } from '../../utils/util'
import { uploadFile, createWork } from '../../utils/api'

/** 作品类型选项 */
interface TypeOption {
  id: string
  name: string
  icon: string
  desc: string
}

const TYPE_OPTIONS: TypeOption[] = [
  { id: 'video', name: '视频', icon: '🎬', desc: 'mp4/mov/avi 等' },
  { id: 'audio', name: '音频', icon: '🎵', desc: 'mp3/wav/flac 等' },
  { id: 'image', name: '图片', icon: '🖼️', desc: 'jpg/png/gif 等，支持多图' },
  { id: 'doc', name: '文档', icon: '📄', desc: 'pdf/doc/ppt 等' },
  { id: 'research', name: '科研', icon: '🔬', desc: '论文/报告/专利' },
  { id: 'volunteer', name: '志愿', icon: '🤝', desc: '社会实践/志愿服务' },
]

const TAG_COLORS = ['#4a90e2', '#e57373', '#81c784', '#ffb74d', '#ba68c8', '#4db6ac']

Page({
  data: {
    typeOptions: TYPE_OPTIONS,
    selectedType: '' as string,
    title: '',
    description: '',
    tagInput: '',
    tags: [] as string[],
    // 文件相关
    uploadedUrl: '',
    uploadedName: '',
    uploadedCover: '',
    uploading: false,
    // 提交状态
    submitting: false,
    // 多图支持
    imageList: [] as string[],
    showImageUpload: false,
  },

  /** 选择作品类型 */
  onTypeSelect(e: any) {
    const typeId = e.currentTarget.dataset.id
    this.setData({
      selectedType: typeId,
      showImageUpload: typeId === 'image',
      // 切换类型时清空已上传文件
      uploadedUrl: '',
      uploadedName: '',
      imageList: [],
    })
  },

  /** 标题输入 */
  onTitleInput(e: any) {
    this.setData({ title: e.detail.value })
  },

  /** 描述输入 */
  onDescInput(e: any) {
    this.setData({ description: e.detail.value })
  },

  /** 标签输入 */
  onTagInput(e: any) {
    this.setData({ tagInput: e.detail.value })
  },

  /** 添加标签 */
  onTagConfirm() {
    const tag = this.data.tagInput.trim()
    if (!tag) return
    if (this.data.tags.length >= 5) {
      toast('最多添加5个标签')
      return
    }
    if (this.data.tags.includes(tag)) {
      toast('标签已存在')
      return
    }
    this.setData({
      tags: [...this.data.tags, tag],
      tagInput: '',
    })
  },

  /** 删除标签 */
  onTagRemove(e: any) {
    const index = e.currentTarget.dataset.index
    const tags = [...this.data.tags]
    tags.splice(index, 1)
    this.setData({ tags })
  },

  /** 选择并上传文件 */
  async onChooseFile() {
    const { selectedType } = this.data
    if (!selectedType) { toast('请先选择作品类型'); return }
    if (this.data.uploading) return

    try {
      // 根据类型选择不同的选择方式
      let res: any

      if (selectedType === 'image') {
        // 图片：支持多选
        res = await wx.chooseMedia({
          count: this.data.imageList.length > 0 ? 9 - this.data.imageList.length : 9,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
        })
        // 逐个上传图片
        for (const item of res.tempFiles) {
          await this._doUpload(item.tempFilePath)
        }
      } else if (selectedType === 'video') {
        res = await wx.chooseMedia({
          count: 1,
          mediaType: ['video'],
          sourceType: ['album', 'camera'],
        })
        await this._doUpload(res.tempFiles[0].tempFilePath)
      } else if (selectedType === 'audio') {
        res = await wx.chooseMessageFile({
          count: 1,
          type: 'file',
        })
        await this._doUpload(res.tempFiles[0].path)
      } else {
        // doc / research / volunteer → 文件选择
        res = await wx.chooseMessageFile({
          count: 1,
          type: 'file',
        })
        await this._doUpload(res.tempFiles[0].path, res.tempFiles[0].name)
      }
    } catch (err: any) {
      if (err.errMsg?.includes('cancel')) return // 用户取消
      console.error('[Publish] chooseFile error:', err)
      toast('选择文件失败')
    }
  },

  /** 执行上传 */
  async _doUpload(tempPath: string, originalName?: string) {
    this.setData({ uploading: true })
    wx.showLoading({ title: '上传中…', mask: true })

    try {
      const result = await uploadFile(tempPath, this.data.selectedType, originalName)

      if (this.data.selectedType === 'image') {
        // 图片：追加到 imageList
        const list = [...this.data.imageList, result.url]
        this.setData({ imageList: list })
        // 第一张作为封面
        if (list.length === 1) {
          this.setData({ uploadedCover: result.url })
        }
      } else {
        // 其他类型：直接设置 URL
        this.setData({
          uploadedUrl: result.url,
          uploadedName: originalName || result.filename,
        })
      }

      wx.hideLoading()
      toast('上传成功', 'success')
    } catch (err: any) {
      wx.hideLoading()
      toast(err.message || '上传失败')
    } finally {
      this.setData({ uploading: false })
    }
  },

  /** 删除已上传的图片 */
  onRemoveImage(e: any) {
    const index = e.currentTarget.dataset.index
    const list = [...this.data.imageList]
    list.splice(index, 1)
    this.setData({
      imageList: list,
      uploadedCover: list.length > 0 ? list[0] : '',
    })
  },

  /** 提交作品 */
  async onSubmit() {
    const { selectedType, title, description, tags, uploadedUrl, imageList, uploadedCover } = this.data

    // === 校验 ===
    if (!selectedType) { toast('请选择作品类型'); return }
    if (!title.trim()) { toast('请输入作品标题'); return }

    // 图片类型必须至少有一张
    if (selectedType === 'image' && imageList.length === 0) {
      toast('请至少上传一张图片')
      return
    }
    // 非图片类型必须有文件
    if (selectedType !== 'image' && !uploadedUrl) {
      toast('请上传作品文件')
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '发布中…', mask: true })

    try {
      // 构建请求体
      const workData: any = {
        title: title.trim(),
        description: description.trim(),
        type: selectedType,
        categoryId: selectedType, // 默认 type = categoryId
        fileUrl: selectedType === 'image' ? (imageList[0] || '') : uploadedUrl,
        tags,
        imageList: selectedType === 'image' ? imageList : [],
      }

      // 如果有封面图（非图片类型也可能有）
      if (uploadedCover) {
        workData.cover = uploadedCover
      }

      await createWork(workData)

      wx.hideLoading()
      wx.showModal({
        title: '发布成功',
        content: '作品已成功发布！',
        showCancel: false,
        confirmText: '去看看',
        success: () => {
          wx.switchTab({ url: '/pages/hall/hall' })
        },
      })
    } catch (err: any) {
      wx.hideLoading()
      toast(err.message || '发布失败，请重试')
    } finally {
      this.setData({ submitting: false })
    }
  },
})
