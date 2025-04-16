document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const fileInput = document.getElementById("file-input")
  const uploadContainer = document.getElementById("upload-container")
  const uploadPlaceholder = document.getElementById("upload-placeholder")
  const previewImage = document.getElementById("preview-image")
  const fileInfo = document.getElementById("file-info")
  const uploadError = document.getElementById("upload-error")
  const compressButton = document.getElementById("compress-button")
  const compressionForm = document.getElementById("compression-form")
  const compressionMethod = document.getElementById("compression-method")
  const compressionLevel = document.getElementById("compression-level")
  const levelValue = document.getElementById("level-value")
  const levelHelpText = document.getElementById("level-help-text")
  const levelContainer = document.getElementById("compression-level-container")
  const methodDescription = document.getElementById("method-description")
  const resultsSection = document.getElementById("results-section")
  const loadingOverlay = document.getElementById("loading-overlay")
  const loadingMessage = document.getElementById("loading-message")
  const progressBar = document.getElementById("progress-bar")
  const tabButtons = document.querySelectorAll(".tab-button")
  const tabContents = document.querySelectorAll(".tab-content")
  const comparisonRange = document.getElementById("comparison-range")
  const comparisonSlider = document.getElementById("comparison-slider")
  const compressedImageContainer = document.querySelector(".comparison-compressed")
  const originalImage = document.getElementById("original-image")
  const compressedImage = document.getElementById("compressed-image")
  const downloadButton = document.getElementById("download-button")
  const themeToggle = document.getElementById("theme-toggle")

  // Metrics elements
  const originalSizeElement = document.getElementById("original-size")
  const compressedSizeElement = document.getElementById("compressed-size")
  const compressionRatioElement = document.getElementById("compression-ratio")
  const psnrElement = document.getElementById("psnr-value")
  const mseElement = document.getElementById("mse-value")
  const processingTimeElement = document.getElementById("processing-time")

  // Variables
  let selectedFile = null
  let originalImageUrl = null
  let compressedImageUrl = null

  // Theme handling
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
    themeToggle.checked = theme === "dark"
  }

  // Check for saved theme preference or respect OS preference
  const savedTheme = localStorage.getItem("theme")
  if (savedTheme) {
    setTheme(savedTheme)
  } else {
    // Check if user prefers dark mode
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }

  // Theme toggle event listener
  themeToggle.addEventListener("change", function () {
    if (this.checked) {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  })

  // Method descriptions
  const methodDescriptions = {
    huffman:
      "Huffman coding is a lossless compression technique that assigns variable-length codes to input characters, with shorter codes for more frequent characters.",
    svd: "Singular Value Decomposition (SVD) is a lossy compression technique that decomposes an image into three matrices and reduces dimensionality while preserving important features.",
    pca: "Principal Component Analysis (PCA) is a lossy compression technique that identifies principal components capturing the most variance in the image data.",
  }

  // Update compression level display
  compressionLevel.addEventListener("input", function () {
    levelValue.textContent = this.value
  })

  // Toggle compression level based on method
  compressionMethod.addEventListener("change", function () {
    // Update method description
    methodDescription.textContent = methodDescriptions[this.value]

    if (this.value === "huffman") {
      levelContainer.classList.add("hidden")
    } else {
      levelContainer.classList.remove("hidden")

      // Update help text based on method
      if (this.value === "svd") {
        levelHelpText.textContent =
          "Higher values reduce more singular values, increasing compression but potentially losing detail."
      } else if (this.value === "pca") {
        levelHelpText.textContent =
          "Higher values retain fewer principal components, increasing compression but potentially losing information."
      }
    }
  })

  // Trigger initial method change event
  compressionMethod.dispatchEvent(new Event("change"))

  // File Upload Handling
  fileInput.addEventListener("change", handleFileSelect)

  uploadContainer.addEventListener("dragover", function (e) {
    e.preventDefault()
    this.classList.add("dragover")
  })

  uploadContainer.addEventListener("dragleave", function () {
    this.classList.remove("dragover")
  })

  uploadContainer.addEventListener("drop", function (e) {
    e.preventDefault()
    this.classList.remove("dragover")

    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files
      handleFileSelect({ target: fileInput })
    }
  })

  function handleFileSelect(e) {
    const file = e.target.files[0]

    if (!file) return

    // Reset error message
    uploadError.textContent = ""
    uploadError.classList.add("hidden")

    // Check if file is an image
    const validTypes = ["image/jpeg", "image/png", "image/tiff"]
    if (!validTypes.includes(file.type)) {
      uploadError.textContent = "Please select a valid image file (JPEG, PNG, or TIFF)."
      uploadError.classList.remove("hidden")
      return
    }

    // Check file size (limit to 100MB to match backend)
    if (file.size > 100 * 1024 * 1024) {
      uploadError.textContent = "File size exceeds 100MB limit. Please select a smaller file."
      uploadError.classList.remove("hidden")
      return
    }

    selectedFile = file

    // Display file info
    const fileSizeKB = (file.size / 1024).toFixed(2)
    fileInfo.textContent = `${file.name} (${fileSizeKB} KB)`

    // Preview image
    const reader = new FileReader()
    reader.onload = (e) => {
      originalImageUrl = e.target.result
      previewImage.src = originalImageUrl
      previewImage.classList.remove("hidden")
      uploadPlaceholder.classList.add("hidden")

      // Enable compress button
      compressButton.disabled = false
    }
    reader.onerror = () => {
      uploadError.textContent = "Error reading file. Please try again."
      uploadError.classList.remove("hidden")
    }
    reader.readAsDataURL(file)
  }

  // Form Submission
  compressionForm.addEventListener("submit", (e) => {
    e.preventDefault()

    if (!selectedFile) {
      uploadError.textContent = "Please select an image file first."
      uploadError.classList.remove("hidden")
      return
    }

    // Show loading overlay
    loadingOverlay.classList.remove("hidden")
    progressBar.style.width = "0%"

    // Update loading message based on method
    const methodName = compressionMethod.options[compressionMethod.selectedIndex].text
    loadingMessage.textContent = `Processing image with ${methodName}...`

    // Simulate progress
    let progress = 0
    const progressInterval = setInterval(() => {
      progress += Math.random() * 5
      if (progress > 90) {
        progress = 90 // Cap at 90% until actual completion
        clearInterval(progressInterval)
      }
      progressBar.style.width = `${progress}%`
    }, 200)

    // Prepare form data
    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("method", compressionMethod.value)

    if (compressionMethod.value !== "huffman") {
      formData.append("level", compressionLevel.value)
    }

    // Send to backend
    fetch("/api/compress", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        clearInterval(progressInterval)

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`)
        }
        return response.json()
      })
      .then((data) => {
        // Complete progress bar
        progressBar.style.width = "100%"

        // Short delay to show completed progress
        setTimeout(() => {
          // Hide loading overlay
          loadingOverlay.classList.add("hidden")

          // Display results
          displayResults(data)
        }, 500)
      })
      .catch((error) => {
        console.error("Error:", error)
        clearInterval(progressInterval)
        loadingOverlay.classList.add("hidden")

        uploadError.textContent = `An error occurred: ${error.message}. Please try again.`
        uploadError.classList.remove("hidden")
      })
  })

  function displayResults(data) {
    // Show results section
    resultsSection.classList.remove("hidden")

    // Store compressed file URL from API response
    compressedImageUrl = data.compressed_media_url

    // Update comparison images
    originalImage.src = originalImageUrl
    compressedImage.src = compressedImageUrl

    // Update metrics
    originalSizeElement.textContent = `${data.original_size.toFixed(2)} KB`
    compressedSizeElement.textContent = `${data.compressed_size.toFixed(2)} KB`
    compressionRatioElement.textContent = `${data.compression_ratio.toFixed(2)}:1`
    psnrElement.textContent = `${data.psnr.toFixed(2)} dB`
    mseElement.textContent = data.mse.toFixed(4)
    processingTimeElement.textContent = `${data.processing_time.toFixed(2)} seconds`

    // Reset comparison slider
    comparisonRange.value = 50
    updateComparisonView()

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: "smooth" })
  }

  // Tab Switching
  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      // Remove active class from all buttons and contents
      tabButtons.forEach((btn) => btn.classList.remove("active"))
      tabContents.forEach((content) => content.classList.remove("active"))

      // Add active class to clicked button and corresponding content
      this.classList.add("active")
      const tabId = this.getAttribute("data-tab")
      document.getElementById(`${tabId}-tab`).classList.add("active")
    })
  })

  // Image Comparison Slider
  comparisonRange.addEventListener("input", updateComparisonView)

  function updateComparisonView() {
    const value = comparisonRange.value
    comparisonSlider.style.left = `${value}%`
    compressedImageContainer.style.clipPath = `inset(0 ${100 - value}% 0 0)`
  }

  // Interactive comparison slider with mouse/touch
  const comparisonContainer = document.getElementById("image-comparison")

  comparisonContainer.addEventListener("mousedown", startDrag)
  comparisonContainer.addEventListener("touchstart", startDrag, { passive: true })

  function startDrag(e) {
    e.preventDefault()
    document.addEventListener("mousemove", drag)
    document.addEventListener("touchmove", drag, { passive: true })
    document.addEventListener("mouseup", stopDrag)
    document.addEventListener("touchend", stopDrag)
  }

  function drag(e) {
    let clientX
    if (e.type === "touchmove") {
      clientX = e.touches[0].clientX
    } else {
      clientX = e.clientX
    }

    const rect = comparisonContainer.getBoundingClientRect()
    let position = ((clientX - rect.left) / rect.width) * 100

    // Constrain position between 0 and 100
    position = Math.max(0, Math.min(100, position))

    comparisonRange.value = position
    updateComparisonView()
  }

  function stopDrag() {
    document.removeEventListener("mousemove", drag)
    document.removeEventListener("touchmove", drag)
    document.removeEventListener("mouseup", stopDrag)
    document.removeEventListener("touchend", stopDrag)
  }

  // Download compressed image
  downloadButton.addEventListener("click", () => {
    if (!compressedImageUrl) return;
  
    const link = document.createElement("a");
    // Add cache-busting timestamp AND full URL
    const fullUrl = `${window.location.origin}${compressedImageUrl}?v=${new Date().getTime()}`;
    link.href = fullUrl;
    link.download = `compressed_${selectedFile.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
})
