import type { Metadata } from "next"
import ImageCompressor from "@/components/image-compressor"

export const metadata: Metadata = {
  title: "Satellite Image Compression",
  description: "Compress satellite images using various techniques",
}

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Satellite Image Compression System</h1>
      <p className="text-gray-600 mb-8 text-center max-w-3xl mx-auto">
        Upload satellite images and compress them using Huffman Coding, Singular Value Decomposition (SVD), or Principal
        Component Analysis (PCA) techniques.
      </p>

      <ImageCompressor />
    </main>
  )
}

