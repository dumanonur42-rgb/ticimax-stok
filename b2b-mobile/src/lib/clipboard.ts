export async function copyToClipboard(value: { text: string; html?: string }): Promise<boolean> {
  if (value.html !== undefined) {
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([value.html], { type: 'text/html' }),
        'text/plain': new Blob([value.text], { type: 'text/plain' })
      })])
      return true
    } catch {}
  }
  try {
    await navigator.clipboard.writeText(value.text)
    return true
  } catch {}
  const textarea = document.createElement('textarea')
  try {
    textarea.value = value.text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}
