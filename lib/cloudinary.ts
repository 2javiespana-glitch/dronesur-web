// Datos de tu cuenta de Cloudinary, donde se guardan las fotos, vídeos y música que subes desde el admin.
// No son secretos: es normal que estén en el código.
// Si cambias de cuenta o renombras el preset en Cloudinary, cámbialo aquí (es el único sitio).
export const CLOUDINARY_CLOUD_NAME = 'bar5rrho'
export const CLOUDINARY_UPLOAD_PRESET = 'dronesur videos'

// Sube un archivo a Cloudinary y devuelve su dirección https.
// "image" para fotos; "auto" para audio y vídeo.
export function uploadToCloudinary(
  file: File,
  endpoint: 'image' | 'auto',
  onProgress?: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${endpoint}/upload`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText).secure_url)
        } catch {
          reject(new Error('Respuesta inesperada de Cloudinary.'))
        }
      } else {
        let detail = ''
        try {
          detail = JSON.parse(xhr.responseText)?.error?.message ?? ''
        } catch {}
        reject(new Error(`No se pudo subir "${file.name}". ${detail}`.trim()))
      }
    }

    xhr.onerror = () =>
      reject(new Error('Error de conexión al subir el archivo. Comprueba tu internet e inténtalo de nuevo.'))

    xhr.send(formData)
  })
}
