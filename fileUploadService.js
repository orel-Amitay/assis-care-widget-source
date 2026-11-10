// File Upload Service for Chat Widget
// This service handles file uploads to Supabase Storage

export class FileUploadService {
  static STORAGE_BUCKET = 'chat-media'
  static MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  
  // Align with assis-ai-agent media parts: image/*, video/*, audio/*, application/pdf.
  // Keep common office/text docs for chat attach even when the model cannot inline-read them.
  static ALLOWED_IMAGE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'image/bmp', 'image/tiff', 'image/heic', 'image/heif', 'image/svg+xml',
  ]
  static ALLOWED_VIDEO_TYPES = [
    'video/mp4', 'video/avi', 'video/quicktime', 'video/mov', 'video/wmv',
    'video/flv', 'video/webm', 'video/mkv', 'video/x-msvideo', 'video/3gpp',
  ]
  static ALLOWED_AUDIO_TYPES = [
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/x-wav',
    'audio/webm', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a',
    'audio/flac', 'audio/opus', 'audio/3gpp',
  ]
  static ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ]

  static FILE_ACCEPT =
    'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.mp3,.wav,.m4a,.aac,.ogg,.flac,.heic,.heif'

  /**
   * Upload a single file to Supabase Storage
   */
  static async uploadFile(file, messageId, supabaseClient) {
    try {
      // Validate file
      const fileType = this.validateFile(file)

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${messageId}_${Date.now()}.${fileExt}`
      const filePath = `${messageId}/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabaseClient.storage
        .from(this.STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) {
        throw new Error(`Upload failed: ${error.message}`)
      }

      // Get public URL
      const { data: urlData } = supabaseClient.storage
        .from(this.STORAGE_BUCKET)
        .getPublicUrl(filePath)

      // Generate thumbnail for images and videos
      let thumbnailUrl = undefined
      if (fileType === 'image' || fileType === 'video') {
        thumbnailUrl = await this.generateThumbnail(file, messageId, fileType, supabaseClient)
      }

      return {
        url: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        thumbnailUrl,
        fileType
      }
    } catch (error) {
      console.error('File upload failed:', error)
      throw error
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadMultipleFiles(files, messageId, supabaseClient) {
    const uploadPromises = files.map(file => this.uploadFile(file, messageId, supabaseClient))
    return Promise.all(uploadPromises)
  }

  /**
   * Generate a thumbnail for images and videos
   */
  static async generateThumbnail(file, messageId, fileType, supabaseClient) {
    try {
      if (fileType === 'image') {
        return this.generateImageThumbnail(file, messageId, supabaseClient)
      } else if (fileType === 'video') {
        return this.generateVideoThumbnail(file, messageId, supabaseClient)
      }
      return undefined
    } catch (error) {
      console.warn('Thumbnail generation failed:', error)
      return undefined
    }
  }

  /**
   * Generate a thumbnail for an image
   */
  static async generateImageThumbnail(file, messageId, supabaseClient) {
    try {
      // Create a canvas to resize the image
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return undefined

      // Load image
      const img = new Image()
      const blobUrl = URL.createObjectURL(file)
      
      return new Promise((resolve) => {
        img.onload = async () => {
          // Calculate thumbnail dimensions (max 200x200)
          const maxSize = 200
          let { width, height } = img
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }
          }

          // Set canvas dimensions
          canvas.width = width
          canvas.height = height

          // Draw resized image
          ctx.drawImage(img, 0, 0, width, height)

          // Convert to blob
          canvas.toBlob(async (blob) => {
            if (!blob) {
              resolve(undefined)
              return
            }

            // Upload thumbnail
            const thumbnailFileName = `${messageId}_thumb_${Date.now()}.jpg`
            const thumbnailPath = `${messageId}/thumbnails/${thumbnailFileName}`

            const { error } = await supabaseClient.storage
              .from(this.STORAGE_BUCKET)
              .upload(thumbnailPath, blob, {
                cacheControl: '3600',
                upsert: false
              })

            if (error) {
              console.warn('Thumbnail upload failed:', error)
              resolve(undefined)
              return
            }

            // Get thumbnail URL
            const { data: thumbnailUrlData } = supabaseClient.storage
              .from(this.STORAGE_BUCKET)
              .getPublicUrl(thumbnailPath)

            URL.revokeObjectURL(blobUrl)
            resolve(thumbnailUrlData.publicUrl)
          }, 'image/jpeg', 0.8)
        }
        img.src = blobUrl
      })
    } catch (error) {
      console.warn('Image thumbnail generation failed:', error)
      return undefined
    }
  }

  /**
   * Generate a thumbnail for a video
   */
  static async generateVideoThumbnail(file, messageId, supabaseClient) {
    try {
      // Create video element
      const video = document.createElement('video')
      const blobUrl = URL.createObjectURL(file)
      
      return new Promise((resolve) => {
        video.onloadedmetadata = async () => {
          // Seek to 1 second or 25% of duration for thumbnail
          const seekTime = Math.min(1, video.duration * 0.25)
          video.currentTime = seekTime
          
          video.onseeked = async () => {
            // Create canvas to capture video frame
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              resolve(undefined)
              return
            }

            // Set canvas dimensions (max 200x200)
            const maxSize = 200
            let { videoWidth, videoHeight } = video
            
            if (videoWidth > videoHeight) {
              if (videoWidth > maxSize) {
                videoHeight = (videoHeight * maxSize) / videoWidth
                videoWidth = maxSize
              }
            } else {
              if (videoHeight > maxSize) {
                videoWidth = (videoWidth * maxSize) / videoHeight
                videoHeight = maxSize
              }
            }

            canvas.width = videoWidth
            canvas.height = videoHeight

            // Draw video frame
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight)

            // Convert to blob
            canvas.toBlob(async (blob) => {
              if (!blob) {
                resolve(undefined)
                return
              }

              // Upload thumbnail
              const thumbnailFileName = `${messageId}_thumb_${Date.now()}.jpg`
              const thumbnailPath = `${messageId}/thumbnails/${thumbnailFileName}`

              const { error } = await supabaseClient.storage
                .from(this.STORAGE_BUCKET)
                .upload(thumbnailPath, blob, {
                  cacheControl: '3600',
                  upsert: false
                })

              if (error) {
                console.warn('Video thumbnail upload failed:', error)
                resolve(undefined)
                return
              }

              // Get thumbnail URL
              const { data: thumbnailUrlData } = supabaseClient.storage
                .from(this.STORAGE_BUCKET)
                .getPublicUrl(thumbnailPath)

              URL.revokeObjectURL(blobUrl)
              resolve(thumbnailUrlData.publicUrl)
            }, 'image/jpeg', 0.8)
          }
        }
        
        video.onerror = () => {
          URL.revokeObjectURL(blobUrl)
          resolve(undefined)
        }
        
        video.src = blobUrl
      })
    } catch (error) {
      console.warn('Video thumbnail generation failed:', error)
      return undefined
    }
  }

  /**
   * Resolve category from MIME and/or filename (drag/drop often omits type).
   */
  static resolveFileCategory(file) {
    const mime = String(file?.type || '').toLowerCase().trim()
    const name = String(file?.name || '').toLowerCase()

    if (
      mime.startsWith('image/')
      || this.ALLOWED_IMAGE_TYPES.includes(mime)
      || /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|heif|svg)$/i.test(name)
    ) {
      return 'image'
    }
    if (
      mime.startsWith('video/')
      || this.ALLOWED_VIDEO_TYPES.includes(mime)
      || /\.(mp4|mov|webm|mkv|avi|wmv|flv|m4v|3gp)$/i.test(name)
    ) {
      return 'video'
    }
    if (
      mime.startsWith('audio/')
      || this.ALLOWED_AUDIO_TYPES.includes(mime)
      || /\.(mp3|wav|m4a|aac|ogg|flac|opus|wma|aiff?)$/i.test(name)
    ) {
      return 'audio'
    }
    if (
      this.ALLOWED_DOCUMENT_TYPES.includes(mime)
      || /\.(pdf|docx?|xlsx?|pptx?|txt|csv)$/i.test(name)
    ) {
      return 'document'
    }
    return null
  }

  /**
   * Validate file before upload and return file type
   */
  static validateFile(file) {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size too large. Maximum size is ${this.MAX_FILE_SIZE / (1024 * 1024)}MB.`)
    }

    const category = this.resolveFileCategory(file)
    if (category) return category
    throw new Error('Invalid file type. Only images, videos, audio, and documents are allowed.')
  }

  /**
   * Get file type from MIME type
   */
  static getFileTypeFromMime(mimeType) {
    const mime = String(mimeType || '').toLowerCase()
    if (mime.startsWith('image/') || this.ALLOWED_IMAGE_TYPES.includes(mime)) return 'image'
    if (mime.startsWith('video/') || this.ALLOWED_VIDEO_TYPES.includes(mime)) return 'video'
    if (mime.startsWith('audio/') || this.ALLOWED_AUDIO_TYPES.includes(mime)) return 'audio'
    if (this.ALLOWED_DOCUMENT_TYPES.includes(mime)) return 'document'
    return 'document'
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get file icon based on file type
   */
  static getFileIcon(fileType, mimeType) {
    const mime = String(mimeType || '')
    if (fileType === 'image') return '🖼️'
    if (fileType === 'video') return '🎥'
    if (fileType === 'audio' || mime.startsWith('audio/')) return '🎧'
    if (mime.includes('pdf')) return '📄'
    if (mime.includes('word') || mime.includes('document')) return '📝'
    if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊'
    if (mime.includes('powerpoint') || mime.includes('presentation')) return '📈'
    return '📎'
  }
}
