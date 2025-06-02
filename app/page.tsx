"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect, memo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Download, Upload, Scissors, Edit, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import JSZip from "jszip"

interface CropArea {
  id: string
  x: number
  y: number
  width: number
  height: number
  name: string
}

// Componente memoizado para cada sprite card
const SpriteCard = memo(
  ({
    area,
    index,
    image,
    editingId,
    editingName,
    onStartEdit,
    onUpdateName,
    onSaveName,
    onCancelEdit,
    onDelete,
  }: {
    area: CropArea
    index: number
    image: HTMLImageElement
    editingId: string | null
    editingName: string
    onStartEdit: (id: string, name: string) => void
    onUpdateName: (name: string) => void
    onSaveName: () => void
    onCancelEdit: () => void
    onDelete: (id: string) => void
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Dibujar preview solo cuando cambie el área o la imagen
    useEffect(() => {
      const canvas = canvasRef.current
      if (canvas && image) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          const maxPreviewSize = 120
          const aspectRatio = area.width / area.height
          let previewWidth = maxPreviewSize
          let previewHeight = maxPreviewSize

          if (aspectRatio > 1) {
            previewHeight = maxPreviewSize / aspectRatio
          } else {
            previewWidth = maxPreviewSize * aspectRatio
          }

          canvas.width = previewWidth
          canvas.height = previewHeight

          ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, previewWidth, previewHeight)
        }
      }
    }, [area, image])

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary">#{index + 1}</Badge>
          <div className="flex gap-1">
            <Button
              onClick={() => onStartEdit(area.id, area.name)}
              variant="ghost"
              size="sm"
              className="text-blue-500 hover:text-blue-700"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => onDelete(area.id)}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Preview of the cropped area */}
        <div className="mb-3 border rounded overflow-hidden bg-gray-100">
          <canvas ref={canvasRef} className="w-full h-auto max-w-[120px] max-h-[120px] mx-auto block" />
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <strong>Nombre:</strong>
            {editingId === area.id ? (
              <div className="flex gap-1 flex-1">
                <Input
                  value={editingName}
                  onChange={(e) => onUpdateName(e.target.value)}
                  className="h-6 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onSaveName()
                    }
                    if (e.key === "Escape") {
                      onCancelEdit()
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" className="h-6 px-2 text-xs" onClick={onSaveName}>
                  ✓
                </Button>
              </div>
            ) : (
              <span className="flex-1">{area.name}</span>
            )}
          </div>
          <div>
            <strong>Posición:</strong> ({Math.round(area.x)}, {Math.round(area.y)})
          </div>
          <div>
            <strong>Tamaño:</strong> {Math.round(area.width)} × {Math.round(area.height)}
          </div>
        </div>
      </Card>
    )
  },
)

SpriteCard.displayName = "SpriteCard"

export default function SpriteCutter() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [cropAreas, setCropAreas] = useState<CropArea[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [currentArea, setCurrentArea] = useState<CropArea | null>(null)
  const [scale, setScale] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [downloadProgress, setDownloadProgress] = useState<{ isDownloading: boolean; current: number; total: number }>({
    isDownloading: false,
    current: 0,
    total: 0,
  })
  const [isDragging, setIsDragging] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      loadImageFile(file)
    }
  }, [])

  const loadImageFile = useCallback((file: File) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      setImage(img)
      setCropAreas([])
      drawCanvas(img, [])
    }
    img.src = URL.createObjectURL(file)
  }, [])

  const resetAll = useCallback(() => {
    setImage(null)
    setCropAreas([])
    setIsDrawing(false)
    setCurrentArea(null)
    setEditingId(null)
    setEditingName("")
    setDownloadProgress({ isDownloading: false, current: 0, total: 0 })

    // Limpiar el input file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const drawCanvas = useCallback((img: HTMLImageElement, areas: CropArea[], tempArea?: CropArea) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Calculate scale to fit image in canvas
    const maxWidth = 800
    const maxHeight = 600
    const imageAspect = img.width / img.height
    const canvasAspect = maxWidth / maxHeight

    let newScale = 1
    if (imageAspect > canvasAspect) {
      newScale = maxWidth / img.width
    } else {
      newScale = maxHeight / img.height
    }

    setScale(newScale)

    const scaledWidth = img.width * newScale
    const scaledHeight = img.height * newScale

    canvas.width = scaledWidth
    canvas.height = scaledHeight

    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)

    // Draw existing crop areas
    areas.forEach((area, index) => {
      ctx.strokeStyle = "#3b82f6"
      ctx.fillStyle = "rgba(59, 130, 246, 0.2)"
      ctx.lineWidth = 2

      const x = area.x * newScale
      const y = area.y * newScale
      const width = area.width * newScale
      const height = area.height * newScale

      ctx.fillRect(x, y, width, height)
      ctx.strokeRect(x, y, width, height)

      // Draw area number
      ctx.fillStyle = "#3b82f6"
      ctx.font = "16px sans-serif"
      ctx.fillText(`${index + 1}`, x + 5, y + 20)
    })

    // Draw temporary area while drawing
    if (tempArea) {
      ctx.strokeStyle = "#ef4444"
      ctx.fillStyle = "rgba(239, 68, 68, 0.2)"
      ctx.lineWidth = 2

      const x = tempArea.x * newScale
      const y = tempArea.y * newScale
      const width = tempArea.width * newScale
      const height = tempArea.height * newScale

      ctx.fillRect(x, y, width, height)
      ctx.strokeRect(x, y, width, height)
    }
  }, [])

  useEffect(() => {
    if (image) {
      drawCanvas(image, cropAreas)
    }
  }, [image, cropAreas, drawCanvas])

  const getCanvasCoordinates = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const x = (event.clientX - rect.left) / scale
      const y = (event.clientY - rect.top) / scale

      return { x, y }
    },
    [scale],
  )

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!image) return

      const point = getCanvasCoordinates(event)
      setIsDrawing(true)
      setStartPoint(point)
      setCurrentArea(null)
    },
    [image, getCanvasCoordinates],
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !image) return

      const point = getCanvasCoordinates(event)
      const width = Math.abs(point.x - startPoint.x)
      const height = Math.abs(point.y - startPoint.y)
      const x = Math.min(startPoint.x, point.x)
      const y = Math.min(startPoint.y, point.y)

      const tempArea: CropArea = {
        id: "",
        x,
        y,
        width,
        height,
        name: "",
      }

      setCurrentArea(tempArea)
      drawCanvas(image, cropAreas, tempArea)
    },
    [isDrawing, image, getCanvasCoordinates, startPoint, drawCanvas, cropAreas],
  )

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentArea || !image) return

    // Only add area if it has meaningful size
    if (currentArea.width > 10 && currentArea.height > 10) {
      const newArea: CropArea = {
        ...currentArea,
        id: Date.now().toString(),
        name: `sprite_${cropAreas.length + 1}`,
      }
      setCropAreas((prev) => [...prev, newArea])
    }

    setIsDrawing(false)
    setCurrentArea(null)
  }, [isDrawing, currentArea, image, cropAreas.length])

  const deleteCropArea = useCallback((id: string) => {
    setCropAreas((prev) => prev.filter((area) => area.id !== id))
  }, [])

  const downloadCrops = useCallback(async () => {
    if (!image || cropAreas.length === 0) return

    setDownloadProgress({ isDownloading: true, current: 0, total: cropAreas.length })

    // Crear un solo ZIP con todos los sprites
    const zip = new JSZip()

    // Agregar cada sprite al ZIP
    for (let i = 0; i < cropAreas.length; i++) {
      const area = cropAreas[i]

      // Actualizar progreso
      setDownloadProgress({ isDownloading: true, current: i + 1, total: cropAreas.length })

      // Crear canvas temporal para el sprite
      const tempCanvas = document.createElement("canvas")
      const tempCtx = tempCanvas.getContext("2d")
      if (!tempCtx) continue

      tempCanvas.width = area.width
      tempCanvas.height = area.height

      // Dibujar el sprite recortado
      tempCtx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)

      // Convertir a blob y agregar al ZIP
      const blob = await new Promise<Blob | null>((resolve) => {
        tempCanvas.toBlob(resolve, "image/png")
      })

      if (blob) {
        zip.file(`${area.name}.png`, blob)
      }
    }

    // Generar y descargar el ZIP
    const zipBlob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sprites_collection.zip`
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setDownloadProgress({ isDownloading: false, current: 0, total: 0 })
  }, [image, cropAreas])

  const clearAll = useCallback(() => {
    setCropAreas([])
    if (image) {
      drawCanvas(image, [])
    }
  }, [image, drawCanvas])

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        const file = files[0]
        if (file.type.startsWith("image/")) {
          loadImageFile(file)
        }
      }
    },
    [loadImageFile],
  )

  // Funciones para manejar la edición de nombres
  const handleStartEdit = useCallback((id: string, name: string) => {
    setEditingId(id)
    setEditingName(name)
  }, [])

  const handleUpdateName = useCallback((name: string) => {
    setEditingName(name)
  }, [])

  const handleSaveName = useCallback(() => {
    if (editingId) {
      setCropAreas((prev) => prev.map((a) => (a.id === editingId ? { ...a, name: editingName } : a)))
      setEditingId(null)
    }
  }, [editingId, editingName])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scissors className="w-6 h-6" />
              Sprite Cutter
            </CardTitle>
            {image && (
              <Button onClick={resetAll} variant="outline" size="sm" className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Cargar Otro
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section - Solo se muestra si no hay imagen */}
          {!image && (
            <div
              ref={dropZoneRef}
              className={`space-y-2 ${isDragging ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Label htmlFor="image-upload">Subir Imagen</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Upload className={`w-12 h-12 mb-4 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
                <p className="text-lg mb-2 font-medium">
                  {isDragging ? "Suelta la imagen aquí" : "Arrastra y suelta una imagen aquí"}
                </p>
                <p className="text-sm text-gray-500 mb-4">o</p>
                <div className="flex items-center gap-4">
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Seleccionar Archivo
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Canvas Section */}
          {image && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-gray-50">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="border border-gray-300 cursor-crosshair max-w-full"
                  style={{ display: "block", margin: "0 auto" }}
                />
              </div>

              <div className="text-sm text-gray-600 text-center">Haz clic y arrastra para marcar áreas de recorte</div>
            </div>
          )}

          {/* Crop Areas List */}
          {cropAreas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Áreas de Recorte ({cropAreas.length})</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={downloadCrops}
                    className="flex items-center gap-2"
                    disabled={downloadProgress.isDownloading}
                  >
                    <Download className="w-4 h-4" />
                    {downloadProgress.isDownloading
                      ? `Procesando ${downloadProgress.current}/${downloadProgress.total} sprites...`
                      : "Descargar ZIP con Todos"}
                  </Button>
                  <Button onClick={clearAll} variant="outline" className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Limpiar Todo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cropAreas.map((area, index) => (
                  <SpriteCard
                    key={area.id}
                    area={area}
                    index={index}
                    image={image!}
                    editingId={editingId}
                    editingName={editingName}
                    onStartEdit={handleStartEdit}
                    onUpdateName={handleUpdateName}
                    onSaveName={handleSaveName}
                    onCancelEdit={handleCancelEdit}
                    onDelete={deleteCropArea}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
