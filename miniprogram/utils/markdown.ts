/**
 * utils/markdown.ts — 轻量级 Markdown → HTML 转换器
 *
 * 专为微信小程序 AI 流式输出设计。
 * 将 AI 输出的 Markdown 文本转为 <rich-text> 可用的 HTML 字符串。
 *
 * 支持的功能：
 *  - 行内代码 `code`
 *  - 代码块 ```code```（含语言标识）
 *  - 加粗 **bold** / __bold__
 *  - 斜体 *italic* / _italic_
 *  - ~~删除线~~
 *  - 标题 # ~ ######
 *  - 无序列表 - / *
 *  - 有序列表 1. 2.
 *  - 链接 [text](url)
 *  - 图片 ![alt](url)
 *  - 引用块 >
 *  - 分隔线 --- / ***
 *  - LaTeX 行内公式 $...$（用 <text> 包裹，保持原文）
 *  - LaTeX 块级公式 $$...$$
 *  - 换行处理
 */

/**
 * 将纯文本中的 HTML 特殊字符转义
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 处理行内样式/标记
 * 顺序重要：先处理最内层的，再处理外层
 */
function parseInline(text: string): string {
  let result = text

  // 转义 HTML 特殊字符（但保留已有标签）
  result = escapeHtml(result)

  // 行内代码 `code` — 必须在其他标记之前处理
  result = result.replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2rpx 8rpx;border-radius:4rpx;font-size:0.9em;font-family:monospace;color:#d63384;">$1</code>')

  // 删除线 ~~text~~
  result = result.replace(/~~([^~]+)~~/g, '<del style="text-decoration:line-through;">$1</del>')

  // 加粗 **text** 或 __text__
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>')

  // 斜体 *text* 或 _text_（避免与加粗冲突）
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  result = result.replace(/_([^_]+)_/g, '<em>$1</em>')

  // 行内 LaTeX $...$
  result = result.replace(/\$(.+?)\$/g, '<text style="font-family:serif;font-style:italic;color:#2c3e50;">$$$1$</text>')

  // 链接 [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" style="color:#6A005F;text-decoration:underline;">$1</a>'
  )

  return result
}

/**
 * 将 Markdown 文本转换为 HTML 字符串
 * 供 <rich-text nodes="{{...}}"> 使用
 */
export function markdownToHtml(md: string): string {
  if (!md) return ''

  // 按行分割
  const lines = md.split('\n')
  const htmlLines: string[] = []
  let inCodeBlock = false
  let codeLang = ''
  let codeContent: string[] = []
  let inBlockQuote = false
  let quoteLines: string[] = []
  let inList = false
  let listType: 'ul' | 'ol' | null = null
  let inLaTeXBlock = false
  let latexLines: string[] = []

  function flushCodeBlock() {
    if (codeContent.length > 0) {
      const langClass = codeLang ? ` class="lang-${codeLang}"` : ''
      htmlLines.push(
        `<pre style="background:#1e1e1e;color:#d4d4d4;padding:24rpx 28rpx;border-radius:12rpx;font-size:24rpx;line-height:1.6;font-family:Menlo,monospace;white-space:pre-wrap;word-break:break-all;overflow-x:auto;max-width:100%;"><code${langClass}>${escapeHtml(codeContent.join('\n'))}</code></pre>`
      )
      codeContent = []
      codeLang = ''
    }
  }

  function flushQuote() {
    if (quoteLines.length > 0) {
      htmlLines.push(
        `<blockquote style="border-left:6rpx solid #6A005F;padding:16rpx 20rpx;margin:16rpx 0;background:#f9f0f7;color:#555;border-radius:4rpx;">${quoteLines.join('<br/>')}</blockquote>`
      )
      quoteLines = []
    }
  }

  function flushList() {
    if (listType) {
      htmlLines.push(`</${listType}>`)
      listType = null
    }
  }

  function flushLaTeXBlock() {
    if (latexLines.length > 0) {
      htmlLines.push(
        `<div style="background:#f8f9fa;padding:20rpx 24rpx;margin:12rpx 0;border-radius:8rpx;font-family:serif;font-style:italic;text-align:center;color:#2c3e50;border:1rpx solid #e8e8e8;overflow-x:auto;"><text>$$${latexLines.join('\n')}$$</text></div>`
      )
      latexLines = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // ===== 代码块 =====
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // 结束代码块
        inCodeBlock = false
        flushCodeBlock()
      } else {
        // 开始代码块
        flushList()
        flushQuote()
        flushLaTeXBlock()
        inCodeBlock = true
        codeLang = trimmed.slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeContent.push(line)
      continue
    }

    // ===== LaTeX 块级公式 =====
    if (trimmed === '$$') {
      if (inLaTeXBlock) {
        inLaTeXBlock = false
        flushLaTeXBlock()
      } else {
        flushList()
        flushQuote()
        inLaTeXBlock = true
      }
      continue
    }

    if (inLaTeXBlock) {
      latexLines.push(line)
      continue
    }

    // 空行：刷新列表、引用
    if (!trimmed) {
      flushList()
      flushQuote()
      htmlLines.push('<br/>')
      continue
    }

    // ===== 分隔线 =====
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushList()
      flushQuote()
      htmlLines.push('<hr style="border:none;border-top:2rpx solid #e0e0e0;margin:24rpx 0;"/>')
      continue
    }

    // ===== 标题 =====
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushList()
      flushQuote()
      const level = headingMatch[1].length
      const content = parseInline(headingMatch[2])
      const sizes: Record<number, string> = {
        1: '40rpx', 2: '36rpx', 3: '32rpx',
        4: '30rpx', 5: '28rpx', 6: '26rpx',
      }
      const fontWeight = level <= 3 ? '700' : '600'
      htmlLines.push(
        `<h${level} style="font-size:${sizes[level] || '28rpx'};font-weight:${fontWeight};margin:20rpx 0 8rpx;color:#333;line-height:1.4;">${content}</h${level}>`
      )
      continue
    }

    // ===== 引用块 =====
    if (trimmed.startsWith('> ')) {
      flushList()
      inBlockQuote = true
      quoteLines.push(parseInline(trimmed.slice(2)))
      continue
    }

    // ===== 无序列表 =====
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    if (ulMatch) {
      if (listType !== 'ul') {
        flushList()
        htmlLines.push('<ul style="padding-left:40rpx;margin:8rpx 0;">')
        listType = 'ul'
      }
      htmlLines.push(`<li style="margin:4rpx 0;line-height:1.6;">${parseInline(ulMatch[1])}</li>`)
      continue
    }

    // ===== 有序列表 =====
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (olMatch) {
      if (listType !== 'ol') {
        flushList()
        htmlLines.push('<ol style="padding-left:40rpx;margin:8rpx 0;">')
        listType = 'ol'
      }
      htmlLines.push(`<li style="margin:4rpx 0;line-height:1.6;">${parseInline(olMatch[1])}</li>`)
      continue
    }

    // 如果之前是列表/引用，先关闭
    flushList()
    flushQuote()

    // ===== 普通段落 =====
    htmlLines.push(`<p style="margin:8rpx 0;line-height:1.8;">${parseInline(trimmed)}</p>`)
  }

  // 收尾清理
  flushCodeBlock()
  flushQuote()
  flushList()
  flushLaTeXBlock()

  return htmlLines.join('\n')
}

/**
 * 判断内容是否包含 Markdown 标记
 * 用于决定是否使用 rich-text 渲染
 */
export function containsMarkdown(text: string): boolean {
  if (!text) return false
  return /(\*\*|__|`|~~|^#{1,6}\s|^\d+\.\s|^[-*+]\s|^>\s|\$.*?\$|\$\$|\|---|\*\*\*)/
    .test(text)
}

/**
 * 智能流式渲染标记（用于流式输出中判断当前可渲染的部分）
 * 返回一个对象，包含可安全渲染的文本和剩余未闭合的部分
 */
export function splitStreamContent(content: string): {
  safeHtml: string
  remaining: string
} {
  // 尝试匹配完整的块
  const patterns = [
    /\*\*[^*]+\*\*/,  // 加粗
    /__[^_]+__/,      // 加粗
    /`[^`]+`/,       // 行内代码
    /~~[^~]+~~/,      // 删除线
    /\$[^$]+\$/,      // 行内 LaTeX
  ]

  // 检查是否有未闭合的标记
  const unclosed = checkUnclosedTags(content)
  if (!unclosed) {
    return {
      safeHtml: markdownToHtml(content),
      remaining: '',
    }
  }

  // 有未闭合的标记时，渲染已完整部分，剩余部分等待后续
  return {
    safeHtml: markdownToHtml(content.substring(0, unclosed.start)),
    remaining: content.substring(unclosed.start),
  }
}

/**
 * 检查是否有未闭合的标记，返回第一个未闭合标记的位置
 */
function checkUnclosedTags(content: string): { start: number; tag: string } | null {
  const openers: [RegExp, string, string][] = [
    [/\*\*/g, '**', '**'],
    [/__/g, '__', '__'],
    [/```/g, '```', '```'],
    [/`/g, '`', '`'],
    [/~~/g, '~~', '~~'],
    [/\$/g, '$', '$'],
    [/\$\$/g, '$$', '$$'],
  ]

  for (const [regex, openTag, closeTag] of openers) {
    const matches = [...content.matchAll(regex)]
    if (matches.length % 2 !== 0) {
      // 有奇数个标记，说明未闭合
      const lastMatch = matches[matches.length - 1]
      if (lastMatch) {
        return { start: lastMatch.index!, tag: openTag }
      }
    }
  }

  return null
}
