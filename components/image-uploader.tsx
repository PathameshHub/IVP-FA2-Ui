"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Download, Upload, ImageIcon } from "lucide-react"
import Image from "next/image"
import ImageProcessor from "@/components/image-processor"

type CompressionMethod = "huffman" | "svd" | "rle" | "dct"

type CompressionResult = {
  originalSize: number
  compressedSize: number
  psnr: number
  mse: number
  compressionRatio: number
  timeTaken: number
  originalImageUrl: string
  compressedImageUrl: string
}

export default function ImageUploader() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [method, setMethod] = useState<CompressionMethod>("huffman")
  const [compressionLevel, setCompressionLevel] = useState([50])
  const [isCompressing, setIsCompressing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<CompressionResult | null>(null)
  const [shouldProcess, setShouldProcess] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setResult(null)
    }
  }

  const handleCompress = () => {
    if (!selectedFile) return
    setShouldProcess(true)
  }

  const handleProcessingStart = () => {
    setIsCompressing(true)
    setProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * 10
        return newProgress >= 95 ? 95 : newProgress
      })
    }, 300)

    return () => clearInterval(progressInterval)
  }

  const handleProcessingComplete = (processingResult: any) => {
    setProgress(100)
    setIsCompressing(false)
    setShouldProcess(false)

    // Create result object
    setResult({
      originalSize: processingResult.originalSize,
      compressedSize: processingResult.compressedSize,
      psnr: processingResult.psnr,
      mse: processingResult.mse,
      compressionRatio: processingResult.compressionRatio,
      timeTaken: processingResult.timeTaken,
      originalImageUrl: previewUrl || "",
      compressedImageUrl: processingResult.compressedImageData,
    })
  }

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="space-y-6">
      {shouldProcess && selectedFile && (
        <ImageProcessor
          imageFile={selectedFile}
          method={method}
          level={compressionLevel[0]}
          onProcessingComplete={handleProcessingComplete}
          onProcessingStart={handleProcessingStart}
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-upload">Upload Satellite Image</Label>
              <div className="mt-2 flex items-center justify-center w-full">
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {previewUrl ? (
                      <div className="relative w-full h-full">
                        <Image src={previewUrl || "/placeholder.svg"} alt="Preview" fill className="object-contain" />
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">Satellite images (PNG, JPG, TIFF)</p>
                      </>
                    )}
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compression-method">Compression Method</Label>
              <Select value={method} onValueChange={(value) => setMethod(value as CompressionMethod)}>
                <SelectTrigger id="compression-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="huffman">Huffman Coding</SelectItem>
                  <SelectItem value="svd">Singular Value Decomposition (SVD)</SelectItem>
                  <SelectItem value="rle">Run-Length Encoding (RLE)</SelectItem>
                  <SelectItem value="dct">Discrete Cosine Transform (DCT)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(method === "svd" || method === "dct") && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="compression-level">Compression Level</Label>
                  <span className="text-sm text-gray-500">{compressionLevel[0]}%</span>
                </div>
                <Slider
                  id="compression-level"
                  min={10}
                  max={90}
                  step={1}
                  value={compressionLevel}
                  onValueChange={setCompressionLevel}
                />
              </div>
            )}

            <Button onClick={handleCompress} disabled={!selectedFile || isCompressing} className="w-full">
              {isCompressing ? "Compressing..." : "Compress Image"}
            </Button>

            {isCompressing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Compression Results</h3>
            {result ? (
              <>
                <div className="relative h-48 w-full bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={result.compressedImageUrl || "/placeholder.svg"}
                    alt="Compressed"
                    fill
                    className="object-contain"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Original Size</p>
                    <p className="text-sm">{(result.originalSize / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Compressed Size</p>
                    <p className="text-sm">{(result.compressedSize / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">PSNR</p>
                    <p className="text-sm">{result.psnr.toFixed(2)} dB</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">MSE</p>
                    <p className="text-sm">{result.mse.toFixed(4)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Compression Ratio</p>
                    <p className="text-sm">{result.compressionRatio.toFixed(2)}:1</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Time Taken</p>
                    <p className="text-sm">{result.timeTaken.toFixed(2)} ms</p>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(result.originalImageUrl, "original-satellite-image.png")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Original
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() =>
                      handleDownload(result.compressedImageUrl, `compressed-${method}-satellite-image.png`)
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Compressed
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500">
                <ImageIcon className="h-12 w-12 mb-4 text-gray-300" />
                <p>Compression results will appear here</p>
                <p className="text-sm mt-2">Upload an image and select a compression method to begin</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
