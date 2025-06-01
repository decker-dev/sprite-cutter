"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Download, Upload, Scissors, Edit } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface CropArea {
  id: string
  x: number
  y: number
  width: number
  height: number
  name: string
}

export default function SpriteCutter() {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [cropAreas, setCropAreas] = useState<CropArea[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [currentArea, setCurrentArea] = useState<CropArea | null>(null)
  const [scale, setScale] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        setImage(img)
        setCropAreas([])
        drawCanvas(img, [])
      }
      img.src = URL.createObjectURL(file)
    }
  }

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

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const x = (event.clientX - rect.left) / scale
    const y = (event.clientY - rect.top) / scale

    return { x, y }
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!image) return

    const point = getCanvasCoordinates(event)
    setIsDrawing(true)
    setStartPoint(point)
    setCurrentArea(null)
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
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
  }

  const handleMouseUp = () => {
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
  }

  const deleteCropArea = (id: string) => {
    setCropAreas((prev) => prev.filter((area) => area.id !== id))
  }

  const downloadCrops = async () => {
    if (!image || cropAreas.length === 0) return

    for (let i = 0; i < cropAreas.length; i++) {
      const area = cropAreas[i]

      // Create a temporary canvas for cropping
      const tempCanvas = document.createElement("canvas")
      const tempCtx = tempCanvas.getContext("2d")
      if (!tempCtx) continue

      tempCanvas.width = area.width
      tempCanvas.height = area.height

      // Draw the cropped portion
      tempCtx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)

      // Convert to blob and download
      tempCanvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `${area.name}.png`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }
      }, "image/png")
    }
  }

  const clearAll = () => {
    setCropAreas([])
    if (image) {
      drawCanvas(image, [])
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="w-6 h-6" />
            Sprite Cutter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section */}
          <div className="space-y-2">
            <Label htmlFor="image-upload">Subir Imagen</Label>
            <div className="flex items-center gap-4">
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="flex-1"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Seleccionar
              </Button>
            </div>
          </div>

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
                  <Button onClick={downloadCrops} className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Descargar Todos
                  </Button>
                  <Button onClick={clearAll} variant="outline" className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Limpiar Todo
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cropAreas.map((area, index) => (
                  <Card key={area.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary">#{index + 1}</Badge>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => {
                            setEditingId(area.id)
                            setEditingName(area.name)
                          }}
                          variant="ghost"
                          size="sm"
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => deleteCropArea(area.id)}
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
                      <canvas
                        ref={(canvas) => {
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

                              ctx.drawImage(
                                image,
                                area.x,
                                area.y,
                                area.width,
                                area.height,
                                0,
                                0,
                                previewWidth,
                                previewHeight,
                              )
                            }
                          }
                        }}
                        className="w-full h-auto max-w-[120px] max-h-[120px] mx-auto block"
                      />
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <strong>Nombre:</strong>
                        {editingId === area.id ? (
                          <div className="flex gap-1 flex-1">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-6 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setCropAreas((prev) =>
                                    prev.map((a) => (a.id === area.id ? { ...a, name: editingName } : a)),
                                  )
                                  setEditingId(null)
                                }
                                if (e.key === "Escape") {
                                  setEditingId(null)
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                setCropAreas((prev) =>
                                  prev.map((a) => (a.id === area.id ? { ...a, name: editingName } : a)),
                                )
                                setEditingId(null)
                              }}
                            >
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
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {!image && (
            <div className="text-center py-12 text-gray-500">
              <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">Sube una imagen para comenzar</p>
              <p className="text-sm">Podrás marcar áreas de recorte y descargar cada sprite por separado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
