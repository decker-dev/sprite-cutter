"use client";

import type React from "react";

import { useState, useRef, useCallback, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Trash2,
  Download,
  Upload,
  Scissors,
  Edit,
  RotateCcw,
  Github,
  Grid3X3,
  Grid2X2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import ImageUploader from "@/components/image-uploader";
import { toast } from "sonner";

import JSZip from "jszip";

interface CropArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
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
  | "resize-e";

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
    area: CropArea;
    index: number;
    image: HTMLImageElement;
    editingId: string | null;
    editingName: string;
    onStartEdit: (id: string, name: string) => void;
    onUpdateName: (name: string) => void;
    onSaveName: () => void;
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Dibujar preview solo cuando cambie el área o la imagen
    useEffect(() => {
      const canvas = canvasRef.current;
      if (canvas && image) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const maxPreviewSize = 120;
          const aspectRatio = area.width / area.height;
          let previewWidth = maxPreviewSize;
          let previewHeight = maxPreviewSize;

          if (aspectRatio > 1) {
            previewHeight = maxPreviewSize / aspectRatio;
          } else {
            previewWidth = maxPreviewSize * aspectRatio;
          }

          canvas.width = previewWidth;
          canvas.height = previewHeight;

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
          );
        }
      }
    }, [area, image]);

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
        <div className="mb-3 border rounded overflow-hidden bg-background/50">
          <canvas
            ref={canvasRef}
            className="w-full h-auto max-w-[120px] max-h-[120px] mx-auto block"
          />
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
                      onSaveName();
                    }
                    if (e.key === "Escape") {
                      onCancelEdit();
                    }
                  }}
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={onSaveName}
                >
                  ✓
                </Button>
              </div>
            ) : (
              <span className="flex-1">{area.name}</span>
            )}
          </div>
          <div>
            <strong>Position:</strong> ({Math.round(area.x)},{" "}
            {Math.round(area.y)})
          </div>
          <div>
            <strong>Size:</strong> {Math.round(area.width)} ×{" "}
            {Math.round(area.height)}
          </div>
        </div>
      </Card>
    );
  },
);

SpriteCard.displayName = "SpriteCard";

export default function SpriteCutter() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [cropAreas, setCropAreas] = useState<CropArea[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentArea, setCurrentArea] = useState<CropArea | null>(null);
  const [scale, setScale] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<{
    isDownloading: boolean;
    current: number;
    total: number;
  }>({
    isDownloading: false,
    current: 0,
    total: 0,
  });

  const [interactionMode, setInteractionMode] =
    useState<InteractionMode>("create");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null); // Área que se mantiene naranja
  const [originalArea, setOriginalArea] = useState<CropArea | null>(null);
  const [isModifying, setIsModifying] = useState(false);
  const [contextMenuAreaId, setContextMenuAreaId] = useState<string | null>(
    null,
  );
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [showContextMenu, setShowContextMenu] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageSelect = useCallback((file: File) => {
    loadImageFile(file);
  }, []);

  const loadImageFile = useCallback((file: File) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setImage(img);
      setCropAreas([]);
      drawCanvas(img, []);
    };
    img.onerror = () => {
      console.error("Error loading image");
    };
    img.src = URL.createObjectURL(file);
  }, []);

  const resetAll = useCallback(() => {
    setImage(null);
    setCropAreas([]);
    setIsDrawing(false);
    setCurrentArea(null);
    setEditingId(null);
    setEditingName("");
    setDownloadProgress({ isDownloading: false, current: 0, total: 0 });
    setSelectedAreaId(null);
    setActiveAreaId(null);
    setOriginalArea(null);
    setIsModifying(false);
    setContextMenuAreaId(null);
  }, []);

  // Función para detectar en qué parte del recuadro se hizo clic
  const getInteractionMode = useCallback(
    (
      point: { x: number; y: number },
      areas: CropArea[],
    ): { mode: InteractionMode; areaId: string | null } => {
      const handleSize = 8 / scale; // Tamaño de los handles de redimensionamiento

      // Buscar en orden de prioridad: activa -> seleccionada -> resto
      const sortedAreas = [...areas].sort((a, b) => {
        if (a.id === activeAreaId) return -1;
        if (b.id === activeAreaId) return 1;
        if (a.id === selectedAreaId) return -1;
        if (b.id === selectedAreaId) return 1;
        return 0;
      });

      for (const area of sortedAreas) {
        const { x, y, width, height } = area;

        // Verificar handles de las esquinas
        if (
          point.x >= x - handleSize &&
          point.x <= x + handleSize &&
          point.y >= y - handleSize &&
          point.y <= y + handleSize
        ) {
          return { mode: "resize-nw", areaId: area.id };
        }
        if (
          point.x >= x + width - handleSize &&
          point.x <= x + width + handleSize &&
          point.y >= y - handleSize &&
          point.y <= y + handleSize
        ) {
          return { mode: "resize-ne", areaId: area.id };
        }
        if (
          point.x >= x - handleSize &&
          point.x <= x + handleSize &&
          point.y >= y + height - handleSize &&
          point.y <= y + height + handleSize
        ) {
          return { mode: "resize-sw", areaId: area.id };
        }
        if (
          point.x >= x + width - handleSize &&
          point.x <= x + width + handleSize &&
          point.y >= y + height - handleSize &&
          point.y <= y + height + handleSize
        ) {
          return { mode: "resize-se", areaId: area.id };
        }

        // Verificar handles de los bordes
        if (
          point.x >= x - handleSize &&
          point.x <= x + width + handleSize &&
          point.y >= y - handleSize &&
          point.y <= y + handleSize
        ) {
          return { mode: "resize-n", areaId: area.id };
        }
        if (
          point.x >= x - handleSize &&
          point.x <= x + width + handleSize &&
          point.y >= y + height - handleSize &&
          point.y <= y + height + handleSize
        ) {
          return { mode: "resize-s", areaId: area.id };
        }
        if (
          point.x >= x - handleSize &&
          point.x <= x + handleSize &&
          point.y >= y - handleSize &&
          point.y <= y + height + handleSize
        ) {
          return { mode: "resize-w", areaId: area.id };
        }
        if (
          point.x >= x + width - handleSize &&
          point.x <= x + width + handleSize &&
          point.y >= y - handleSize &&
          point.y <= y + height + handleSize
        ) {
          return { mode: "resize-e", areaId: area.id };
        }

        // Verificar si está dentro del área (para mover)
        if (
          point.x >= x &&
          point.x <= x + width &&
          point.y >= y &&
          point.y <= y + height
        ) {
          return { mode: "move", areaId: area.id };
        }
      }

      return { mode: "create", areaId: null };
    },
    [scale, activeAreaId, selectedAreaId],
  );

  // Función para obtener el cursor apropiado
  const getCursor = useCallback(
    (point: { x: number; y: number }, areas: CropArea[]): string => {
      const { mode } = getInteractionMode(point, areas);

      switch (mode) {
        case "resize-nw":
        case "resize-se":
          return "nw-resize";
        case "resize-ne":
        case "resize-sw":
          return "ne-resize";
        case "resize-n":
        case "resize-s":
          return "ns-resize";
        case "resize-w":
        case "resize-e":
          return "ew-resize";
        case "move":
          return "move";
        default:
          return "crosshair";
      }
    },
    [getInteractionMode],
  );

  const drawCanvas = useCallback(
    (img: HTMLImageElement, areas: CropArea[], tempArea?: CropArea) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Calculate scale to fit image in canvas
      const maxWidth = 800;
      const maxHeight = 600;
      const imageAspect = img.width / img.height;
      const canvasAspect = maxWidth / maxHeight;

      let newScale = 1;
      if (imageAspect > canvasAspect) {
        newScale = maxWidth / img.width;
      } else {
        newScale = maxHeight / img.height;
      }

      setScale(newScale);

      const scaledWidth = img.width * newScale;
      const scaledHeight = img.height * newScale;

      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

      // Función para dibujar un área
      const drawArea = (
        area: CropArea,
        index: number,
        color: "blue" | "orange" | "red",
      ) => {
        const colors = {
          blue: { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.2)" },
          orange: { stroke: "#f97316", fill: "rgba(249, 115, 22, 0.2)" },
          red: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.2)" },
        };

        ctx.strokeStyle = colors[color].stroke;
        ctx.fillStyle = colors[color].fill;
        ctx.lineWidth = 2;

        const x = area.x * newScale;
        const y = area.y * newScale;
        const width = area.width * newScale;
        const height = area.height * newScale;

        ctx.fillRect(x, y, width, height);
        ctx.strokeRect(x, y, width, height);

        // Draw area number
        ctx.fillStyle = colors[color].stroke;
        ctx.font = "16px sans-serif";
        ctx.fillText(`${index + 1}`, x + 5, y + 20);

        // Draw resize handles if selected or active
        if (color === "blue" || color === "orange") {
          const handleSize = 6;
          ctx.fillStyle = colors[color].stroke;

          // Corner handles
          ctx.fillRect(
            x - handleSize / 2,
            y - handleSize / 2,
            handleSize,
            handleSize,
          );
          ctx.fillRect(
            x + width - handleSize / 2,
            y - handleSize / 2,
            handleSize,
            handleSize,
          );
          ctx.fillRect(
            x - handleSize / 2,
            y + height - handleSize / 2,
            handleSize,
            handleSize,
          );
          ctx.fillRect(
            x + width - handleSize / 2,
            y + height - handleSize / 2,
            handleSize,
            handleSize,
          );

          // Edge handles
          ctx.fillRect(
            x + width / 2 - handleSize / 2,
            y - handleSize / 2,
            handleSize,
            handleSize,
          );
          ctx.fillRect(
            x + width / 2 - handleSize / 2,
            y + height - handleSize / 2,
            handleSize,
            handleSize,
          );
          ctx.fillRect(
            x - handleSize / 2,
            y + height / 2 - handleSize / 2,
            handleSize,
            handleSize,
          );
          ctx.fillRect(
            x + width - handleSize / 2,
            y + height / 2 - handleSize / 2,
            handleSize,
            handleSize,
          );
        }
      };

      // Separar áreas por estado para controlar el orden de renderizado
      const normalAreas: { area: CropArea; index: number }[] = [];
      const selectedArea: { area: CropArea; index: number } | null =
        selectedAreaId
          ? {
              area: areas.find((a) => a.id === selectedAreaId)!,
              index: areas.findIndex((a) => a.id === selectedAreaId),
            }
          : null;
      const activeArea: { area: CropArea; index: number } | null = activeAreaId
        ? {
            area: areas.find((a) => a.id === activeAreaId)!,
            index: areas.findIndex((a) => a.id === activeAreaId),
          }
        : null;

      // Agregar áreas normales (no seleccionadas ni activas)
      areas.forEach((area, index) => {
        if (area.id !== selectedAreaId && area.id !== activeAreaId) {
          normalAreas.push({ area, index });
        }
      });

      // Dibujar en orden: normales -> seleccionada -> activa
      for (const { area, index } of normalAreas) {
        drawArea(area, index, "blue");
      }

      if (selectedArea && selectedArea.area.id !== activeAreaId) {
        drawArea(selectedArea.area, selectedArea.index, "blue");
      }

      if (activeArea) {
        drawArea(activeArea.area, activeArea.index, "orange");
      }

      // Draw temporary area while creating (always red and on top)
      if (tempArea) {
        drawArea(
          tempArea,
          areas.length, // Número temporal para el área nueva
          "red",
        );
      }
    },
    [selectedAreaId, activeAreaId],
  );

  useEffect(() => {
    if (image) {
      drawCanvas(image, cropAreas);
    }
  }, [image, cropAreas, drawCanvas]);

  // Effect para manejar clicks fuera del context menu y tecla Escape
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (showContextMenu) {
        setShowContextMenu(false);
        setContextMenuAreaId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showContextMenu) {
        setShowContextMenu(false);
        setContextMenuAreaId(null);
      }
    };

    if (showContextMenu) {
      document.addEventListener("click", handleGlobalClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("click", handleGlobalClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showContextMenu]);

  const getCanvasCoordinates = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / scale;
      const y = (event.clientY - rect.top) / scale;

      return { x, y };
    },
    [scale],
  );

  // Nueva función para detectar si un punto está dentro de un área
  const getAreaAtPoint = useCallback(
    (point: { x: number; y: number }, areas: CropArea[]): CropArea | null => {
      // Buscar en orden de prioridad: activa -> seleccionada -> resto
      const sortedAreas = [...areas].sort((a, b) => {
        if (a.id === activeAreaId) return -1;
        if (b.id === activeAreaId) return 1;
        if (a.id === selectedAreaId) return -1;
        if (b.id === selectedAreaId) return 1;
        return 0;
      });

      for (const area of sortedAreas) {
        if (
          point.x >= area.x &&
          point.x <= area.x + area.width &&
          point.y >= area.y &&
          point.y <= area.y + area.height
        ) {
          return area;
        }
      }
      return null;
    },
    [activeAreaId, selectedAreaId],
  );

  // Nueva función para crear grilla
  const createGrid = useCallback(
    (areaId: string, rows: number, cols: number) => {
      const area = cropAreas.find((a) => a.id === areaId);
      if (!area) {
        console.error("Could not find the selected area");
        return;
      }

      const cellWidth = area.width / cols;
      const cellHeight = area.height / rows;
      const newAreas: CropArea[] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const newArea: CropArea = {
            id: `${Date.now()}_${row}_${col}`,
            x: area.x + col * cellWidth,
            y: area.y + row * cellHeight,
            width: cellWidth,
            height: cellHeight,
            name: `${area.name}_${row + 1}x${col + 1}`,
          };
          newAreas.push(newArea);
        }
      }

      // Remover el área original y agregar las nuevas
      setCropAreas((prev) => {
        const filtered = prev.filter((a) => a.id !== areaId);
        return [...filtered, ...newAreas];
      });

      // Limpiar estados relacionados con el área eliminada
      if (selectedAreaId === areaId) {
        setSelectedAreaId(null);
      }
      if (activeAreaId === areaId) {
        setActiveAreaId(null);
      }
      setContextMenuAreaId(null);
      setShowContextMenu(false);
    },
    [cropAreas, selectedAreaId, activeAreaId],
  );

  // Manejar click derecho
  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!image) return;

      event.preventDefault();
      const point = getCanvasCoordinates(event);
      const area = getAreaAtPoint(point, cropAreas);

      if (area) {
        setContextMenuAreaId(area.id);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
        setShowContextMenu(true);
      } else {
        setShowContextMenu(false);
      }
    },
    [image, getCanvasCoordinates, getAreaAtPoint, cropAreas],
  );

  // Cerrar context menu cuando se hace click fuera
  const handleCloseContextMenu = useCallback(() => {
    setShowContextMenu(false);
    setContextMenuAreaId(null);
  }, []);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!image) return;

      // Cerrar context menu si está abierto
      if (showContextMenu) {
        setShowContextMenu(false);
        setContextMenuAreaId(null);
      }

      // Solo procesar click izquierdo para interacciones normales
      if (event.button !== 0) return;

      const point = getCanvasCoordinates(event);
      const { mode, areaId } = getInteractionMode(point, cropAreas);

      setInteractionMode(mode);
      setSelectedAreaId(areaId);
      setIsDrawing(true);
      setStartPoint(point);

      if (areaId) {
        const area = cropAreas.find((a) => a.id === areaId);
        if (area) {
          setOriginalArea({ ...area });
          setIsModifying(true);
          // Si hacemos clic en un área diferente a la activa, la nueva se vuelve activa
          if (areaId !== activeAreaId) {
            setActiveAreaId(areaId);
          }
        }
      } else {
        // Click en área vacía - desactivar área activa
        setActiveAreaId(null);
        setCurrentArea(null);
        setOriginalArea(null);
        setIsModifying(false);
      }
    },
    [
      image,
      getCanvasCoordinates,
      getInteractionMode,
      cropAreas,
      activeAreaId,
      showContextMenu,
    ],
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!image) return;

      const point = getCanvasCoordinates(event);

      // Actualizar cursor
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = getCursor(point, cropAreas);
      }

      if (!isDrawing) return;

      if (interactionMode === "create") {
        // Crear nueva área - esto desactiva el área activa
        setActiveAreaId(null);

        const width = Math.abs(point.x - startPoint.x);
        const height = Math.abs(point.y - startPoint.y);
        const x = Math.min(startPoint.x, point.x);
        const y = Math.min(startPoint.y, point.y);

        const tempArea: CropArea = {
          id: "",
          x,
          y,
          width,
          height,
          name: "",
        };

        setCurrentArea(tempArea);
        drawCanvas(image, cropAreas, tempArea);
      } else if (selectedAreaId && originalArea) {
        // Modificar área existente
        const deltaX = point.x - startPoint.x;
        const deltaY = point.y - startPoint.y;

        const newArea = { ...originalArea };

        switch (interactionMode) {
          case "move":
            newArea.x = originalArea.x + deltaX;
            newArea.y = originalArea.y + deltaY;
            break;
          case "resize-nw":
            newArea.x = originalArea.x + deltaX;
            newArea.y = originalArea.y + deltaY;
            newArea.width = originalArea.width - deltaX;
            newArea.height = originalArea.height - deltaY;
            break;
          case "resize-ne":
            newArea.y = originalArea.y + deltaY;
            newArea.width = originalArea.width + deltaX;
            newArea.height = originalArea.height - deltaY;
            break;
          case "resize-sw":
            newArea.x = originalArea.x + deltaX;
            newArea.width = originalArea.width - deltaX;
            newArea.height = originalArea.height + deltaY;
            break;
          case "resize-se":
            newArea.width = originalArea.width + deltaX;
            newArea.height = originalArea.height + deltaY;
            break;
          case "resize-n":
            newArea.y = originalArea.y + deltaY;
            newArea.height = originalArea.height - deltaY;
            break;
          case "resize-s":
            newArea.height = originalArea.height + deltaY;
            break;
          case "resize-w":
            newArea.x = originalArea.x + deltaX;
            newArea.width = originalArea.width - deltaX;
            break;
          case "resize-e":
            newArea.width = originalArea.width + deltaX;
            break;
        }

        // Asegurar dimensiones mínimas
        if (newArea.width < 10) newArea.width = 10;
        if (newArea.height < 10) newArea.height = 10;

        // Actualizar el área en el estado
        setCropAreas((prev) =>
          prev.map((area) => (area.id === selectedAreaId ? newArea : area)),
        );
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
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;

    if (interactionMode === "create" && currentArea && image) {
      // Solo agregar área si tiene tamaño significativo
      if (currentArea.width > 10 && currentArea.height > 10) {
        const newArea: CropArea = {
          ...currentArea,
          id: Date.now().toString(),
          name: `sprite_${cropAreas.length + 1}`,
        };
        setCropAreas((prev) => [...prev, newArea]);
        // El área recién creada se vuelve activa
        setActiveAreaId(newArea.id);
      }
      setCurrentArea(null);
    }

    setIsDrawing(false);
    setIsModifying(false);
    setOriginalArea(null);
  }, [isDrawing, interactionMode, currentArea, image, cropAreas.length]);

  const deleteCropArea = useCallback(
    (id: string) => {
      const areaToDelete = cropAreas.find((area) => area.id === id);
      if (!areaToDelete) return;

      setCropAreas((prev) => prev.filter((area) => area.id !== id));
      if (selectedAreaId === id) {
        setSelectedAreaId(null);
      }
      if (activeAreaId === id) {
        setActiveAreaId(null);
      }
    },
    [selectedAreaId, activeAreaId, cropAreas],
  );

  const downloadCrops = useCallback(async () => {
    if (!image || cropAreas.length === 0) {
      return;
    }

    const startTime = Date.now();
    let loadingToast: string | number | null = null;

    // Only show loading toast after 300ms
    const loadingTimer = setTimeout(() => {
      loadingToast = toast.loading("Preparing download...", {
        description: "Processing sprites for download",
      });
    }, 300);

    try {
      setDownloadProgress({
        isDownloading: true,
        current: 0,
        total: cropAreas.length,
      });

      // Crear un solo ZIP con todos los sprites
      const zip = new JSZip();

      // Agregar cada sprite al ZIP
      for (let i = 0; i < cropAreas.length; i++) {
        const area = cropAreas[i];

        // Actualizar progreso
        setDownloadProgress({
          isDownloading: true,
          current: i + 1,
          total: cropAreas.length,
        });

        // Only update toast if it was already shown (after 300ms)
        if (loadingToast) {
          toast.loading(
            `Processing sprite ${i + 1} of ${cropAreas.length}...`,
            {
              id: loadingToast,
              description: `Generating: ${area.name}.png`,
            },
          );
        }

        // Crear canvas temporal para el sprite
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) {
          console.warn(`Could not process sprite: ${area.name}`);
          continue;
        }

        tempCanvas.width = area.width;
        tempCanvas.height = area.height;

        // Dibujar el sprite recortado
        tempCtx.drawImage(
          image,
          area.x,
          area.y,
          area.width,
          area.height,
          0,
          0,
          area.width,
          area.height,
        );

        // Convertir a blob y agregar al ZIP
        const blob = await new Promise<Blob | null>((resolve) => {
          tempCanvas.toBlob(resolve, "image/png");
        });

        if (blob) {
          zip.file(`${area.name}.png`, blob);
        }
      }

      // Generate ZIP
      if (loadingToast) {
        toast.loading("Generating ZIP file...", {
          id: loadingToast,
          description: "Compressing sprites",
        });
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Download file
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sprites_collection.zip";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Cancel timer if operation finished before 300ms
      clearTimeout(loadingTimer);

      // Always show success toast when download completes
      toast.success("Download completed!", {
        id: loadingToast || undefined,
        description: `Downloaded ${cropAreas.length} sprites in sprites_collection.zip`,
      });
    } catch (error) {
      console.error("Error during download:", error);
      clearTimeout(loadingTimer);

      // Always show errors
      toast.error("Download error", {
        id: loadingToast || undefined,
        description:
          "There was a problem generating the sprites. Please try again.",
      });
    } finally {
      setDownloadProgress({ isDownloading: false, current: 0, total: 0 });
    }
  }, [image, cropAreas]);

  const clearAll = useCallback(() => {
    if (cropAreas.length === 0) {
      return;
    }

    setCropAreas([]);
    setSelectedAreaId(null);
    setActiveAreaId(null);
    setIsModifying(false);
    if (image) {
      drawCanvas(image, []);
    }
  }, [image, drawCanvas, cropAreas.length]);

  // Funciones para manejar la edición de nombres
  const handleStartEdit = useCallback((id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  }, []);

  const handleUpdateName = useCallback((name: string) => {
    setEditingName(name);
  }, []);

  const handleSaveName = useCallback(() => {
    if (editingId) {
      setCropAreas((prev) =>
        prev.map((a) => (a.id === editingId ? { ...a, name: editingName } : a)),
      );
      setEditingId(null);
    }
  }, [editingId, editingName]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scissors className="w-6 h-6" />
              Sprite Cutter
            </CardTitle>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {image && (
                <Button
                  onClick={resetAll}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Section - Solo se muestra si no hay imagen */}
          {!image && (
            <div className="space-y-2">
              <Label htmlFor="image-upload">Upload Image</Label>
              <ImageUploader onImageSelect={handleImageSelect} />
            </div>
          )}

          {/* Canvas Section with Context Menu */}
          {image && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-background relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onContextMenu={handleContextMenu}
                  className="border border-border max-w-full rounded"
                  style={{ display: "block", margin: "0 auto" }}
                />

                {/* Custom Context Menu */}
                {showContextMenu && contextMenuAreaId && (
                  <div
                    className="fixed z-50 min-w-[12rem] bg-background border border-border rounded-md shadow-lg py-1"
                    style={{
                      left: contextMenuPosition.x,
                      top: contextMenuPosition.y,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        createGrid(contextMenuAreaId, 2, 2);
                        handleCloseContextMenu();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-foreground"
                    >
                      <Grid2X2 className="w-4 h-4" />
                      Grid 2x2
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        createGrid(contextMenuAreaId, 3, 3);
                        handleCloseContextMenu();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-foreground"
                    >
                      <Grid3X3 className="w-4 h-4" />
                      Grid 3x3
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        createGrid(contextMenuAreaId, 4, 4);
                        handleCloseContextMenu();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-foreground"
                    >
                      <Grid3X3 className="w-4 h-4" />
                      Grid 4x4
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        createGrid(contextMenuAreaId, 5, 5);
                        handleCloseContextMenu();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-foreground"
                    >
                      <Grid3X3 className="w-4 h-4" />
                      Grid 5x5
                    </button>
                    <div className="border-t border-border my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        createGrid(contextMenuAreaId, 3, 4);
                        handleCloseContextMenu();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-foreground"
                    >
                      <Grid3X3 className="w-4 h-4" />
                      Grid 3x4
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        createGrid(contextMenuAreaId, 4, 3);
                        handleCloseContextMenu();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-foreground"
                    >
                      <Grid3X3 className="w-4 h-4" />
                      Grid 4x3
                    </button>
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground text-center space-y-1">
                <div>
                  🔴 Red: Creating new • 🔵 Blue: Normal • 🟠 Orange: Active
                  (always on top)
                </div>
                <div>
                  Click on an area to activate it • Right-click on areas for
                  grid options
                </div>
              </div>
            </div>
          )}

          {/* Crop Areas List */}
          {cropAreas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Crop Areas ({cropAreas.length})
                </h3>
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
                  <Button
                    onClick={clearAll}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
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

      {/* GitHub Button - Fixed position at bottom right */}
      <a
        href="https://github.com/decker-dev/sprite-cutter"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-background shadow-lg hover:shadow-xl transition-shadow"
        >
          <Github className="w-4 h-4" />
          GitHub
        </Button>
      </a>
    </div>
  );
}
