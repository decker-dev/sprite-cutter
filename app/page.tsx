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

type InteractionMode =
  | "create"
  | "move"
  | "resize-nw"
  | "resize-ne"
  | "resize-sw"
  | "resize-se"
  | "resize-n"
  | "resize-s"
  | "resize-w"
  | "resize-e"

// Memoized component for each sprite card
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

    // Draw preview only when area or image changes
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
            <strong>Name:</strong>
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
            <strong>Position:</strong> ({Math.round(area.x)}, {Math.round(area.y)})
          </div>
          <div>
            <strong>Size:</strong> {Math.round(area.width)} × {Math.round(area.height)}
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
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("create")
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null) // Area that stays orange
  const [originalArea, setOriginalArea] = useState<CropArea | null>(null)
  const [isModifying, setIsModifying] = useState(false)

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
    setSelectedAreaId(null)
    setActiveAreaId(null)
    setOriginalArea(null)
    setIsModifying(false)

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  // Function to detect which part of the rectangle was clicked
  const getInteractionMode = useCallback(
    (point: { x: number; y: number }, areas: CropArea[]): { mode: InteractionMode; areaId: string | null } => {
      const handleSize = 8 / scale // Size of resize handles

      // Search in priority order: active -> selected -> rest
      const sortedAreas = [...areas].sort((a, b) => {
        if (a.id === activeAreaId) return -1
        if (b.id === activeAreaId) return 1
        if (a.id === selectedAreaId) return -1
        if (b.id === selectedAreaId) return 1
        return 0
      })

      for (const area of sortedAreas) {
        const { x, y, width, height } = area

        // Check corner handles
        if (
          point.x >= x - handleSize &&
          point.x <= x + handleSize &&
          point.y >= y - handleSize &&
          point.y <= y + handleSize
        ) {
          return { mode: "resize-nw", areaId: area.id }
        }
        if (
          point.x >= x + width - handleSize &&
          point.x <= x + width + handleSize &&
          point.y >= y - handleSize &&
          point.y <= y + handleSize
        ) {
          return { mode: "resize-ne", areaId: area.id }
        }
        if (
          point.x >= x - handleSize &&
          point.x <= x + handleSize &&
          point.y >= y + height - handleSize &&
          point.y <= y + height + handleSize
        ) {
          return { mode: "resize-sw", areaId: area.id }
        }
        if (
          point.x >= x + width - handleSize &&
          point.x <= x + width + handleSize &&
          point.y >= y + height - handleSize &&
          point.y <= y + height + handleSize
        ) {
          return { mode: "resize-se", areaId: area.id }
        }

        // Check edge handles
        if (
          point.x >= x - handleSize &&
          point.x <= x + width + handleSize &&
          point.y >= y - handleSize &&
          point.y <= y + handleSize
        ) {
          return { mode: "resize-n", areaId: area.id }
        }
        if (
          point.x >= x - handleSize &&
          point.x <= x + width + handleSize &&
          point.y >= y + height - handleSize &&
          point.y <= y + height + handleSize
        ) {
          return { mode: "resize-s", areaId: area.id }
        }
        if (
          point.x >= x - handleSize &&
          point.x <= x + handleSize &&
          point.y >= y - handleSize &&
          point.y <= y + height + handleSize
        ) {
          return { mode: "resize-w", areaId: area.id }
        }
        if (
          point.x >= x + width - handleSize &&
          point.x <= x + width + handleSize &&
          point.y >= y - handleSize &&
          point.y <= y + height + handleSize
        ) {
          return { mode: "resize-e", areaId: area.id }
        }

        // Check if inside area (for moving)
        if (point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height) {
          return { mode: "move", areaId: area.id }
        }
      }

      return { mode: "create", areaId: null }
    },
    [scale, activeAreaId, selectedAreaId],
  )

  // Function to get the appropriate cursor
  const getCursor = useCallback(
    (point: { x: number; y: number }, areas: CropArea[]): string => {
      const { mode } = getInteractionMode(point, areas)

      switch (mode) {
        case "resize-nw":
        case "resize-se":
          return "nw-resize"
        case "resize-ne":
        case "resize-sw":
          return "ne-resize"
        case "resize-n":
        case "resize-s":
          return "ns-resize"
        case "resize-w":
        case "resize-e":
          return "ew-resize"
        case "move":
          return "move"
        default:
          return "crosshair"
      }
    },
    [getInteractionMode],
  )

  const drawCanvas = useCallback(
    (img: HTMLImageElement, areas: CropArea[], tempArea?: CropArea) => {
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

      // Function to draw an area
      const drawArea = (area: CropArea, index: number, color: "blue" | "orange" | "red") => {
        const { x, y, width, height } = area

        ctx.strokeStyle = color === "blue" ? "#3b82f6" : color === "orange" ? "#f97316" : "#ef4444"
        ctx.lineWidth = 2 / scale
        ctx.strokeRect(x, y, width, height)

        // Draw area number
        ctx.fillStyle = color === "blue" ? "#3b82f6" : color === "orange" ? "#f97316" : "#ef4444"
        ctx.font = `${14 / scale}px Arial`
        ctx.fillText(`#${index + 1}`, x + 4 / scale, y + 18 / scale)

        // Draw area name if it has one
        if (area.name && area.name !== `sprite_${area.id.slice(0, 8)}`) {
          ctx.fillText(area.name, x + 4 / scale, y + 36 / scale)
        }

        // Draw resize handles if selected or active
        if (area.id === selectedAreaId || area.id === activeAreaId) {
          const handleSize = 6
          ctx.fillStyle = "#ffffff"
          ctx.strokeStyle = "#000000"

          // Corner handles
          ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
          ctx.fillRect(x + width - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
          ctx.fillRect(x - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)
          ctx.fillRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)

          // Edge handles
          ctx.fillRect(x + width / 2 - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
          ctx.fillRect(x + width / 2 - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)
          ctx.fillRect(x - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize)
          ctx.fillRect(x + width - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize)

          ctx.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(x + width - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(x - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(x + width / 2 - handleSize / 2, y - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(x + width / 2 - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(x - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(x + width - handleSize / 2, y + height / 2 - handleSize / 2, handleSize, handleSize)
        }
      }

      // Separate areas by state to control rendering order
      const normalAreas: CropArea[] = []
      const selectedArea = cropAreas.find((area) => area.id === selectedAreaId)
      const activeArea = cropAreas.find((area) => area.id === activeAreaId)

      // Add normal areas (not selected or active)
      cropAreas.forEach((area) => {
        if (area.id !== selectedAreaId && area.id !== activeAreaId) {
          normalAreas.push(area)
        }
      })

      // Draw in order: normal -> selected -> active
      normalAreas.forEach((area, index) => {
        const areaIndex = cropAreas.indexOf(area)
        drawArea(area, areaIndex, "blue")
      })

      if (selectedArea && selectedArea.id !== activeAreaId) {
        drawArea(selectedArea, cropAreas.indexOf(selectedArea), "blue")
      }

      if (activeArea) {
        drawArea(activeArea, cropAreas.indexOf(activeArea), "orange")
      }

      // Draw temporary area while creating (always red and on top)
      if (tempArea) {
        drawArea(
          tempArea,
          areas.length, // Temporary number for the new area
          "red",
        )
      }
    },
    [selectedAreaId, activeAreaId],
  )

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
      const { mode, areaId } = getInteractionMode(point, cropAreas)

      setInteractionMode(mode)
      setSelectedAreaId(areaId)
      setIsDrawing(true)
      setStartPoint(point)

      if (areaId) {
        const area = cropAreas.find((a) => a.id === areaId)
        if (area) {
          setOriginalArea({ ...area })
          setIsModifying(true)
          // If we click on a different area than the active one, the new one becomes active
          if (areaId !== activeAreaId) {
            setActiveAreaId(areaId)
            setSelectedAreaId(null) // Clear selected when activating another
          } else if (!areaId) {
            // Click on empty area - deactivate active area
            setActiveAreaId(null)
            setSelectedAreaId(null)
          }
        }
      } else {
        // Create new area - this deactivates the active area
        setActiveAreaId(null)
        setSelectedAreaId(null)
        setIsDrawing(true)
        setStartPoint(point)
        setCurrentArea({
          id: "",
          x: point.x,
          y: point.y,
          width: 0,
          height: 0,
          name: "",
        })
        drawCanvas(image, cropAreas, currentArea || undefined)
      }
    },
    [image, getCanvasCoordinates, getInteractionMode, cropAreas, activeAreaId],
  )

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!image) return

      const point = getCanvasCoordinates(event)

      // Update cursor
      const canvas = canvasRef.current
      if (canvas) {
        canvas.style.cursor = getCursor(point, cropAreas)
      }

      if (!isDrawing) return

      if (interactionMode === "create") {
        // Create new area - this deactivates the active area
        setActiveAreaId(null)

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
      } else if (selectedAreaId && originalArea) {
        // Modify existing area
        const deltaX = point.x - startPoint.x
        const deltaY = point.y - startPoint.y

        const newArea = { ...originalArea }

        switch (interactionMode) {
          case "move":
            newArea.x = originalArea.x + deltaX
            newArea.y = originalArea.y + deltaY
            break
          case "resize-nw":
            newArea.x = originalArea.x + deltaX
            newArea.y = originalArea.y + deltaY
            newArea.width = originalArea.width - deltaX
            newArea.height = originalArea.height - deltaY
            break
          case "resize-ne":
            newArea.y = originalArea.y + deltaY
            newArea.width = originalArea.width + deltaX
            newArea.height = originalArea.height - deltaY
            break
          case "resize-sw":
            newArea.x = originalArea.x + deltaX
            newArea.width = originalArea.width - deltaX
            newArea.height = originalArea.height + deltaY
            break
          case "resize-se":
            newArea.width = originalArea.width + deltaX
            newArea.height = originalArea.height + deltaY
            break
          case "resize-n":
            newArea.y = originalArea.y + deltaY
            newArea.height = originalArea.height - deltaY
            break
          case "resize-s":
            newArea.height = originalArea.height + deltaY
            break
          case "resize-w":
            newArea.x = originalArea.x + deltaX
            newArea.width = originalArea.width - deltaX
            break
          case "resize-e":
            newArea.width = originalArea.width + deltaX
            break
        }

        // Ensure minimum dimensions
        if (newArea.width < 10) newArea.width = 10
        if (newArea.height < 10) newArea.height = 10

        // Update the area in state
        setCropAreas((prev) => prev.map((area) => (area.id === selectedAreaId ? newArea : area)))
      }
    },
    [
      image,
      getCanvasCoordinates,
      getCursor,
      cropAreas,
      isDrawing,
      interactionMode,
      selectedAreaId,
      originalArea,
      startPoint,
      drawCanvas,
    ],
  )

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return

    if (interactionMode === "create" && currentArea && image) {
      // Only add area if it has significant size
      if (currentArea.width > 10 && currentArea.height > 10) {
        const newArea: CropArea = {
          ...currentArea,
          id: Date.now().toString(),
          name: `sprite_${cropAreas.length + 1}`,
        }
        setCropAreas((prev) => [...prev, newArea])
        // The newly created area becomes active automatically
        setActiveAreaId(newArea.id)
      }
      setCurrentArea(null)
    }

    setIsDrawing(false)
    setIsModifying(false)
    setOriginalArea(null)
  }, [isDrawing, interactionMode, currentArea, image, cropAreas.length])

  const deleteCropArea = useCallback(
    (id: string) => {
      setCropAreas((prev) => prev.filter((area) => area.id !== id))
      if (selectedAreaId === id) {
        setSelectedAreaId(null)
      }
      if (activeAreaId === id) {
        setActiveAreaId(null)
      }
    },
    [selectedAreaId, activeAreaId],
  )

  const downloadCrops = useCallback(async () => {
    if (!image || cropAreas.length === 0) return

    setDownloadProgress({ isDownloading: true, current: 0, total: cropAreas.length })

    // Create a single ZIP with all sprites
    const zip = new JSZip()

    for (let i = 0; i < cropAreas.length; i++) {
      const area = cropAreas[i]
      setDownloadProgress({ isDownloading: true, current: i + 1, total: cropAreas.length })

      const canvas = document.createElement("canvas")
      canvas.width = area.width
      canvas.height = area.height
      const ctx = canvas.getContext("2d")

      if (ctx) {
        ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height)

        // Convert to blob and add to ZIP
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob!)
          }, "image/png")
        })

        const fileName = area.name.endsWith(".png") ? area.name : `${area.name}.png`
        zip.file(fileName, blob)
      }
    }

    // Generate and download ZIP
    const content = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(content)
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
    setSelectedAreaId(null)
    setActiveAreaId(null)
    setIsModifying(false)
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

  // Functions to handle name editing
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
                Load Another
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section - Only shown if no image */}
          {!image && (
            <div
              ref={dropZoneRef}
              className={`space-y-2 ${isDragging ? "ring-2 ring-blue-500 bg-blue-50" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Label htmlFor="image-upload">Upload Image</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <Upload className={`w-12 h-12 mb-4 ${isDragging ? "text-blue-500" : "text-gray-400"}`} />
                <p className="text-lg mb-2 font-medium">
                  {isDragging ? "Drop image here" : "Drag and drop an image here"}
                </p>
                <p className="text-sm text-gray-500 mb-4">or</p>
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
                    Select File
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
                  className="border border-gray-300 max-w-full"
                  style={{ display: "block", margin: "0 auto" }}
                />
              </div>

              <div className="text-sm text-gray-600 text-center space-y-1">
                <div>🔴 Red: Creating new • 🔵 Blue: Normal • 🟠 Orange: Active (always on top)</div>
                <div>Click on an area to activate it • Click on empty space to deactivate</div>
              </div>
            </div>
          )}

          {/* Crop Areas List */}
          {cropAreas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Crop Areas ({cropAreas.length})</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={downloadCrops}
                    className="flex items-center gap-2"
                    disabled={downloadProgress.isDownloading}
                  >
                    <Download className="w-4 h-4" />
                    {downloadProgress.isDownloading
                      ? `Processing ${downloadProgress.current}/${downloadProgress.total} sprites...`
                      : "Download ZIP with All"}
                  </Button>
                  <Button onClick={clearAll} variant="outline" className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Clear All
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
