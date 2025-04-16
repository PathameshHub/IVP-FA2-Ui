"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Upload, Download, ImageIcon } from "lucide-react"
import ImageComparison from "@/components/image-comparison"
import { compressImage } from "@/lib/compression"
import type { CompressionResult } from "@/lib/types"

export default function ImageCompressor() {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [compressedImage, setCompressedImage] = useState<string | null>(null)
  const [compressionMethod, setCompressionMethod] = useState<string>("huffman")
  const [compressionLevel, setCompressionLevel] = useState<number[]>([50])
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [metrics, setMetrics] = useState<{
    psnr: number | null
    mse: number | null
    compressionRatio: number | null
    originalSize: number | null
    compressedSize: number | null
  }>({
    psnr: null,
    mse: null,
    compressionRatio: null,
    originalSize: null,
    compressedSize: null,
  })

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setOriginalImage(event.target.result as string)
        setCompressedImage(null)
        setMetrics({
          psnr: null,
          mse: null,
          compressionRatio: null,
          originalSize: file.size / 1024, // KB
          compressedSize: null,
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCompression = async () => {
    if (!originalImage) return

    setIsProcessing(true)

    try {
      // In a real application, this would call a Python backend
      const result: CompressionResult = await compressImage(originalImage, compressionMethod, compressionLevel[0])

      setCompressedImage(result.compressedImageUrl)
      setMetrics({
        psnr: result.psnr,
        mse: result.mse,
        compressionRatio: result.compressionRatio,
        originalSize: metrics.originalSize,
        compressedSize: result.compressedSize,
      })
    } catch (error) {
      console.error("Error compressing image:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = () => {
    if (!compressedImage) return

    const link = document.createElement("a")
    link.href = compressedImage
    link.download = `compressed-satellite-image-${compressionMethod}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Upload Image</h2>
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8 h-64 bg-gray-50">
              {originalImage ? (
                <div className="relative w-full h-full">
                  <img
                    src={originalImage || "/placeholder.svg"}
                    alt="Original satellite image"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Upload a satellite image (JPG/PNG)</p>
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-center">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button className="flex items-center gap-2">
                    <Upload size={16} />
                    Upload Image
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Compression Settings</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Compression Method</h3>
                <RadioGroup
                  value={compressionMethod}
                  onValueChange={setCompressionMethod}
                  className="grid grid-cols-1 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="huffman" id="huffman" />
                    <Label htmlFor="huffman">Huffman Coding (Lossless)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="svd" id="svd" />
                    <Label htmlFor="svd">Singular Value Decomposition (SVD)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pca" id="pca" />
                    <Label htmlFor="pca">Principal Component Analysis (PCA)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <h3 className="text-sm font-medium">Compression Level</h3>
                  <span className="text-sm text-gray-500">{compressionLevel[0]}%</span>
                </div>
                <Slider
                  value={compressionLevel}
                  onValueChange={setCompressionLevel}
                  min={10}
                  max={90}
                  step={5}
                  disabled={compressionMethod === "huffman"}
                />
                {compressionMethod === "huffman" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Huffman coding is lossless and doesn't use compression levels
                  </p>
                )}
              </div>

              <Button onClick={handleCompression} disabled={!originalImage || isProcessing} className="w-full">
                {isProcessing ? "Processing..." : "Compress Image"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {originalImage && compressedImage && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Results</h2>

          <Tabs defaultValue="comparison">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="comparison">Image Comparison</TabsTrigger>
              <TabsTrigger value="metrics">Compression Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="pt-4">
              <ImageComparison originalImage={originalImage} compressedImage={compressedImage} />
              <div className="mt-4 flex justify-center">
                <Button onClick={handleDownload} className="flex items-center gap-2">
                  <Download size={16} />
                  Download Compressed Image
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Original Size</h3>
                    <p className="text-lg font-semibold">{metrics.originalSize?.toFixed(2)} KB</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Compressed Size</h3>
                    <p className="text-lg font-semibold">{metrics.compressedSize?.toFixed(2)} KB</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Compression Ratio</h3>
                    <p className="text-lg font-semibold">{metrics.compressionRatio?.toFixed(2)}:1</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Peak Signal-to-Noise Ratio (PSNR)</h3>
                    <p className="text-lg font-semibold">{metrics.psnr?.toFixed(2)} dB</p>
                    <p className="text-xs text-gray-500">
                      Higher values indicate better quality (typically 30-50 dB is good)
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Mean Squared Error (MSE)</h3>
                    <p className="text-lg font-semibold">{metrics.mse?.toFixed(4)}</p>
                    <p className="text-xs text-gray-500">Lower values indicate less difference from the original</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  )
}

