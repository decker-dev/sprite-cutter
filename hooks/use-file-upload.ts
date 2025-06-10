"use client"

import { useState, useCallback, useRef } from "react"

interface FileWithPreview {
  id: string
  file: File
  preview: string
}

interface UseFileUploadOptions {
  accept?: string
  maxSize?: number
  multiple?: boolean
}

interface UseFileUploadState {
  files: FileWithPreview[]
  isDragging: boolean
  errors: string[]
}

interface UseFileUploadActions {
  handleDragEnter: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  openFileDialog: () => void
  removeFile: (id: string) => void
  getInputProps: () => React.InputHTMLAttributes<HTMLInputElement>
}

export function useFileUpload(options: UseFileUploadOptions = {}): [UseFileUploadState, UseFileUploadActions] {
  const { accept = "*", maxSize, multiple = false } = options

  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (accept !== "*" && !file.type.match(accept.replace("*", ".*"))) {
      return `File type not supported`
    }

    return null
  }, [accept])

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileWithPreview[] = []
    const newErrors: string[] = []

    newFiles.forEach(file => {
      const error = validateFile(file)
      if (error) {
        newErrors.push(error)
      } else {
        const fileWithPreview: FileWithPreview = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview: URL.createObjectURL(file)
        }
        validFiles.push(fileWithPreview)
      }
    })

    setErrors(newErrors)

    if (!multiple) {
      // Limpiar archivos anteriores si no es múltiple
      files.forEach(file => URL.revokeObjectURL(file.preview))
      setFiles(validFiles.slice(0, 1))
    } else {
      setFiles(prev => [...prev, ...validFiles])
    }
  }, [validateFile, multiple, files])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [addFiles])

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== id)
    })
    setErrors([])
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }, [addFiles])

  const getInputProps = useCallback((): React.InputHTMLAttributes<HTMLInputElement> => ({
    type: "file",
    accept,
    multiple,
    onChange: handleFileInputChange,
    style: { display: 'none' }
  }), [accept, multiple, handleFileInputChange])

  return [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ]
} 