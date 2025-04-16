"use client"

import { useEffect, useRef, useState } from "react"
import { Progress } from "@/components/ui/progress"

type CompressionMethod = "huffman" | "svd" | "rle" | "dct"

type ProcessingResult = {
  originalSize: number
  compressedSize: number
  psnr: number
  mse: number
  compressionRatio: number
  timeTaken: number
  compressedImageData: string
}

interface ImageProcessorProps {
  imageFile: File | null
  method: CompressionMethod
  level: number
  onProcessingComplete: (result: ProcessingResult) => void
  onProcessingStart: () => void
}

export default function ImageProcessor({
  imageFile,
  method,
  level,
  onProcessingComplete,
  onProcessingStart,
}: ImageProcessorProps) {
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!imageFile || isProcessing) return

    const processImage = async () => {
      setIsProcessing(true)
      onProcessingStart()
      setProgress(10)

      try {
        // Load image into canvas
        const imageUrl = URL.createObjectURL(imageFile)
        const img = new Image()
        img.crossOrigin = "anonymous"

        img.onload = async () => {
          // Get original canvas and context
          const canvas = canvasRef.current
          const hiddenCanvas = hiddenCanvasRef.current
          if (!canvas || !hiddenCanvas) return

          // Set canvas dimensions
          canvas.width = img.width
          canvas.height = img.height
          hiddenCanvas.width = img.width
          hiddenCanvas.height = img.height

          const ctx = canvas.getContext("2d")
          const hiddenCtx = hiddenCanvas.getContext("2d")
          if (!ctx || !hiddenCtx) return

          // Draw original image
          ctx.drawImage(img, 0, 0)
          setProgress(30)

          // Get image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const pixels = imageData.data

          // Convert to grayscale for simplicity
          for (let i = 0; i < pixels.length; i += 4) {
            const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
            pixels[i] = pixels[i + 1] = pixels[i + 2] = gray
          }

          // Put grayscale image back
          ctx.putImageData(imageData, 0, 0)
          setProgress(40)

          // Start timing
          const startTime = performance.now()

          // Apply selected compression method
          let compressedData
          switch (method) {
            case "huffman":
              compressedData = await applyHuffmanCompression(imageData, setProgress)
              break
            case "svd":
              compressedData = await applySVDCompression(imageData, level, setProgress)
              break
            case "rle":
              compressedData = await applyRLECompression(imageData, setProgress)
              break
            case "dct":
              compressedData = await applyDCTCompression(imageData, level, setProgress)
              break
            default:
              compressedData = imageData
          }

          // End timing
          const endTime = performance.now()
          const timeTaken = endTime - startTime

          // Draw compressed image
          hiddenCtx.putImageData(compressedData, 0, 0)
          setProgress(90)

          // Calculate metrics
          const { psnr, mse } = calculateMetrics(imageData, compressedData)
          const originalSize = imageFile.size
          const compressedSize = Math.round(originalSize * (1 - level / 100)) // Simulated size
          const compressionRatio = originalSize / compressedSize

          // Get compressed image as data URL
          const compressedImageData = hiddenCanvas.toDataURL("image/png")

          setProgress(100)

          // Return results
          onProcessingComplete({
            originalSize,
            compressedSize,
            psnr,
            mse,
            compressionRatio,
            timeTaken,
            compressedImageData,
          })

          // Clean up
          URL.revokeObjectURL(imageUrl)
        }

        img.src = imageUrl
      } catch (error) {
        console.error("Error processing image:", error)
      } finally {
        setIsProcessing(false)
      }
    }

    processImage()
  }, [imageFile, method, level, onProcessingComplete, onProcessingStart, isProcessing])

  return (
    <div className="hidden">
      <canvas ref={canvasRef} />
      <canvas ref={hiddenCanvasRef} />
      {isProcessing && (
        <div className="mt-4">
          <Progress value={progress} />
          <p className="text-sm text-center mt-2">Processing: {Math.round(progress)}%</p>
        </div>
      )}
    </div>
  )
}

// Compression algorithm implementations
async function applyHuffmanCompression(
  imageData: ImageData,
  setProgress: (progress: number) => void,
): Promise<ImageData> {
  // Simple implementation for demonstration
  setProgress(50)

  // Create a copy of the image data
  const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)

  // Apply some simple processing to simulate compression
  // In a real implementation, this would be actual Huffman coding
  for (let i = 0; i < result.data.length; i += 4) {
    // Round pixel values to simulate some loss
    result.data[i] = Math.round(result.data[i] / 10) * 10
    result.data[i + 1] = Math.round(result.data[i + 1] / 10) * 10
    result.data[i + 2] = Math.round(result.data[i + 2] / 10) * 10
  }

  setProgress(80)
  return result
}

async function applySVDCompression(
  imageData: ImageData,
  level: number,
  setProgress: (progress: number) => void,
): Promise<ImageData> {
  // Simple implementation for demonstration
  setProgress(50)

  // Create a copy of the image data
  const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)

  // Apply blur to simulate SVD compression (higher level = more blur)
  const blurFactor = level / 20
  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = imageData.width
  tempCanvas.height = imageData.height
  const tempCtx = tempCanvas.getContext("2d")

  if (tempCtx) {
    tempCtx.putImageData(imageData, 0, 0)
    tempCtx.filter = `blur(${blurFactor}px)`
    tempCtx.drawImage(tempCanvas, 0, 0)
    const blurredData = tempCtx.getImageData(0, 0, imageData.width, imageData.height)
    result.data.set(blurredData.data)
  }

  setProgress(80)
  return result
}

async function applyRLECompression(imageData: ImageData, setProgress: (progress: number) => void): Promise<ImageData> {
  // Simple implementation for demonstration
  setProgress(50)

  // Create a copy of the image data
  const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)

  // Apply some simple processing to simulate compression
  // In a real implementation, this would be actual RLE
  for (let i = 0; i < result.data.length; i += 4) {
    // Quantize colors to simulate RLE compression
    result.data[i] = Math.round(result.data[i] / 20) * 20
    result.data[i + 1] = Math.round(result.data[i + 1] / 20) * 20
    result.data[i + 2] = Math.round(result.data[i + 2] / 20) * 20
  }

  setProgress(80)
  return result
}

async function applyDCTCompression(
  imageData: ImageData,
  level: number,
  setProgress: (progress: number) => void,
): Promise<ImageData> {
  // Simple implementation for demonstration
  setProgress(50)

  // Create a copy of the image data
  const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)

  // Apply some simple processing to simulate compression
  // In a real implementation, this would be actual DCT
  const quantizationFactor = Math.max(1, Math.round(level / 10))

  for (let i = 0; i < result.data.length; i += 4) {
    // Quantize colors more aggressively with higher level
    result.data[i] = Math.round(result.data[i] / quantizationFactor) * quantizationFactor
    result.data[i + 1] = Math.round(result.data[i + 1] / quantizationFactor) * quantizationFactor
    result.data[i + 2] = Math.round(result.data[i + 2] / quantizationFactor) * quantizationFactor
  }

  setProgress(80)
  return result
}

// Calculate image quality metrics
function calculateMetrics(original: ImageData, compressed: ImageData): { psnr: number; mse: number } {
  let sumSquaredDiff = 0
  const length = Math.min(original.data.length, compressed.data.length)

  for (let i = 0; i < length; i += 4) {
    for (let j = 0; j < 3; j++) {
      // RGB channels
      const diff = original.data[i + j] - compressed.data[i + j]
      sumSquaredDiff += diff * diff
    }
  }

  const pixelCount = (length / 4) * 3 // Number of color values (RGB)
  const mse = sumSquaredDiff / pixelCount
  const psnr = mse === 0 ? 100 : 20 * Math.log10(255 / Math.sqrt(mse))

  return { psnr, mse }
}
