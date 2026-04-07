/**
 * resizing an image data URL to fit within maxWidth and preserving aspect ratio
 * returns a JPEG data URL
 *
 * @param {string} dataUrl
 * @param {number} maxWidth
 * @returns {Promise<string>}
 */
export function resizeImage(dataUrl, maxWidth) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * read a File object into a base64 data URL -> resizing if over sizeLimit bytes.
 *
 * @param {File} file
 * @param {number} [sizeLimit=2097152]  default 2 mb
 * @param {number} [maxWidth=600]
 * @returns {Promise<string>}
 */
export function readImageFile(file, sizeLimit = 2 * 1024 * 1024, maxWidth = 600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload  = async (e) => {
      const dataUrl = e.target.result
      try {
        resolve(file.size > sizeLimit ? await resizeImage(dataUrl, maxWidth) : dataUrl)
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsDataURL(file)
  })
}
