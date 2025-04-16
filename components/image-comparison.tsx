"use client"

import { useState, useRef, useEffect } from "react"
import { Slider } from "@/components/ui/slider"

interface ImageComparisonProps {
  originalImage: string
  compressedImage: string
}

export default function ImageComparison({ originalImage, compressedImage }: ImageComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState<number[]>([50])
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        })
      }
    }

    // Set initial dimensions
    updateDimensions()

    // Update dimensions on window resize
    window.addEventListener("resize", updateDimensions)

    return () => {
      window.removeEventListener("resize", updateDimensions)
    }
  }, [containerRef, originalImage, compressedImage])

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative h-[400px] overflow-hidden border rounded-lg">
        {/* Original Image (Background) */}
        <div className="absolute inset-0">
          <img
            src={originalImage || "/placeholder.svg"}
            alt="Original satellite image"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Compressed Image (Foreground with clip) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition[0]}% 0 0)`,
          }}
        >
          <img
            src={compressedImage || "/placeholder.svg"}
            alt="Compressed satellite image"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Slider Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
          style={{
            left: `${sliderPosition[0]}%`,
            transform: "translateX(-50%)",
          }}
        >
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center">
            <div className="w-4 h-4 bg-gray-800 rounded-full"></div>
          </div>
        </div>

        {/* Labels */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Original</div>
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Compressed</div>
      </div>

      <div className="px-4">
        <Slider
          value={sliderPosition}
          onValueChange={setSliderPosition}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Original</span>
          <span>Compressed</span>
        </div>
      </div>
    </div>
  )
}

