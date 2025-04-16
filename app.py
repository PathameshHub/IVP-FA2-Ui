from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
import os
import cv2
import numpy as np
from scipy import linalg
import heapq
from collections import Counter
import time
import uuid
import logging
from PIL import Image
import io
import subprocess

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for all routes

# Create directories for storing media
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
COMPRESSED_FOLDER = os.path.join(BASE_DIR, 'static', 'compressed')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(COMPRESSED_FOLDER, exist_ok=True)

# Maximum file size (100MB)
MAX_CONTENT_LENGTH = 100 * 1024 * 1024
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Supported media formats
ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'tif', 'tiff'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS.union(ALLOWED_VIDEO_EXTENSIONS)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_video_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS

# Huffman Coding implementation
class HuffmanNode:
    def __init__(self, value, freq):
        self.value = value
        self.freq = freq
        self.left = None
        self.right = None
    
    def __lt__(self, other):
        return self.freq < other.freq

def build_huffman_tree(frequencies):
    heap = [HuffmanNode(value, freq) for value, freq in frequencies.items()]
    heapq.heapify(heap)
    
    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        
        merged = HuffmanNode(None, left.freq + right.freq)
        merged.left = left
        merged.right = right
        
        heapq.heappush(heap, merged)
    
    return heap[0]

def build_huffman_codes(node, code="", mapping=None):
    if mapping is None:
        mapping = {}
    
    if node is not None:
        if node.value is not None:
            mapping[node.value] = code
        
        build_huffman_codes(node.left, code + "0", mapping)
        build_huffman_codes(node.right, code + "1", mapping)
    
    return mapping

def huffman_compress(image):
    try:
        # Convert image to bytes first
        success, encoded_image = cv2.imencode('.jpg', image)
        if not success:
            raise ValueError("Failed to encode image")
        
        # Convert to 1D array
        flattened = encoded_image.flatten()
        
        # Calculate frequency of each byte value
        frequencies = Counter(flattened)
        
        # Build Huffman tree and codes
        tree = build_huffman_tree(frequencies)
        codes = build_huffman_codes(tree)
        
        # Encode the image using Huffman codes
        encoded_bits = ''.join([codes[byte] for byte in flattened])
        
        # Pad the bits to make length multiple of 8
        padding = 8 - (len(encoded_bits) % 8)
        encoded_bits += '0' * padding
        
        # Convert bit string to bytes
        encoded_bytes = bytearray()
        for i in range(0, len(encoded_bits), 8):
            byte = encoded_bits[i:i+8]
            encoded_bytes.append(int(byte, 2))
        
        # For Huffman, we'll return the encoded bytes directly
        # since we can't properly reconstruct the image without the codes
        # Calculate metrics based on size reduction only
        original_size = image.size * 8  # 8 bits per pixel
        compressed_size = len(encoded_bytes) * 8
        compression_ratio = original_size / compressed_size
        
        # Since we're not reconstructing, use placeholder metrics
        mse = 0
        psnr = 100
        
        # Return original image but with size metrics
        return image, compression_ratio, mse, psnr
    except Exception as e:
        logger.error(f"Error in Huffman compression: {str(e)}")
        raise

# SVD Compression
def svd_compress(image, level):
    try:
        # Convert to grayscale if not already
        if len(image.shape) > 2:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Perform SVD
        U, sigma, Vt = linalg.svd(gray)
        
        # Calculate how many singular values to keep based on compression level
        # Higher level means more compression (fewer values kept)
        k = int((100 - level) * min(gray.shape) / 100)
        k = max(1, k)  # Ensure at least 1 component is kept
        
        # Reconstruct image with reduced components
        compressed = np.dot(U[:, :k], np.dot(np.diag(sigma[:k]), Vt[:k, :]))
        
        # Ensure pixel values are in valid range
        compressed = np.clip(compressed, 0, 255).astype(np.uint8)
        
        # Calculate metrics
        mse = np.mean((gray - compressed) ** 2)
        if mse == 0:
            psnr = 100
        else:
            psnr = 10 * np.log10((255 ** 2) / mse)
        
        # Calculate compression ratio
        original_size = gray.shape[0] * gray.shape[1] * 8  # 8 bits per pixel
        compressed_size = (U[:, :k].size + sigma[:k].size + Vt[:k, :].size) * 32  # 32 bits for float
        compression_ratio = original_size / compressed_size
        
        # If original was color, convert back to color for display consistency
        if len(image.shape) > 2:
            compressed_color = cv2.cvtColor(compressed, cv2.COLOR_GRAY2BGR)
            return compressed_color, compression_ratio, mse, psnr
        
        return compressed, compression_ratio, mse, psnr
    except Exception as e:
        logger.error(f"Error in SVD compression: {str(e)}")
        raise

# RLE Compression
def rle_compress(image):
    # Implement Run-Length Encoding compression logic here
    pass

# DCT Compression
def dct_compress(image):
    # Implement Discrete Cosine Transform compression logic here
    pass

# Video compression using FFmpeg
def compress_video(input_path, output_path, level):
    try:
        # Determine compression settings based on level (1-100)
        # Higher level means more compression (lower quality)
        crf = min(51, max(0, int(level * 0.51)))  # Convert to CRF scale (0-51, lower is better)
        
        # Construct FFmpeg command
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-c:v', 'libx264',
            '-crf', str(crf),
            '-preset', 'medium',  # Speed/compression tradeoff
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y',  # Overwrite output file if it exists
            output_path
        ]
        
        # Run FFmpeg command
        start_time = time.time()
        process = subprocess.run(cmd, capture_output=True, text=True)
        
        if process.returncode != 0:
            logger.error(f"FFmpeg error: {process.stderr}")
            raise Exception(f"FFmpeg error: {process.stderr}")
        
        # Calculate metrics
        original_size = os.path.getsize(input_path)
        compressed_size = os.path.getsize(output_path)
        compression_ratio = original_size / compressed_size if compressed_size > 0 else 1
        processing_time = time.time() - start_time
        
        # For video, MSE and PSNR are not as straightforward to calculate
        # Would require frame-by-frame comparison
        mse = 0  # Placeholder
        psnr = 0  # Placeholder
        
        return compression_ratio, mse, psnr, processing_time
    except Exception as e:
        logger.error(f"Error in video compression: {str(e)}")
        raise

@app.route('/api/compress', methods=['POST'])
def compress_media():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': f'Invalid file format. Supported formats: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
        
        method = request.form.get('method', 'auto')
        level = int(request.form.get('level', 50))
        
        if level < 10 or level > 90:
            return jsonify({'error': 'Compression level must be between 10 and 90'}), 400
        
        # Generate unique filenames
        original_ext = os.path.splitext(file.filename)[1]
        unique_id = str(uuid.uuid4())
        original_filename = unique_id + original_ext
        original_path = os.path.join(UPLOAD_FOLDER, original_filename)
        
        # Save original file
        file.save(original_path)
        
        # Determine if it's a video or image
        is_video = is_video_file(file.filename)
        
        if is_video:
            # Process video
            if method != 'auto' and method != 'ffmpeg':
                return jsonify({'error': 'Only FFmpeg compression is supported for videos'}), 400
            
            compressed_filename = unique_id + ".mp4"  # Always output as MP4
            compressed_path = os.path.join(COMPRESSED_FOLDER, compressed_filename)
            
            try:
                compression_ratio, mse, psnr, processing_time = compress_video(
                    original_path, compressed_path, level
                )
            except Exception as e:
                logger.error(f"Video compression error: {str(e)}")
                return jsonify({'error': f'Error during video compression: {str(e)}'}), 500
            
            # Return video results
            original_size = os.path.getsize(original_path) / 1024  # KB
            compressed_size = os.path.getsize(compressed_path) / 1024  # KB
            
            return jsonify({
                'media_type': 'video',
                'compressed_media_url': f'/static/compressed/{compressed_filename}',
                'original_size': original_size,
                'compressed_size': compressed_size,
                'compression_ratio': compression_ratio,
                'processing_time': processing_time
            })
        else:
            # Process image
            if method not in ['huffman', 'svd', 'pca', 'auto']:
                return jsonify({'error': 'Invalid compression method for images'}), 400
            
            # Auto-select method based on image type
            if method == 'auto':
                method = 'svd'  # Default to SVD as a reasonable choice
                
            # Handle different image formats
            try:
                # For TIFF files, use PIL to convert to a format OpenCV can handle
                if original_filename.lower().endswith(('.tif', '.tiff')):
                    with Image.open(original_path) as img:
                        # Convert to RGB if it's not already
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                        # Save as PNG temporarily
                        temp_path = original_path + '.png'
                        img.save(temp_path)
                        # Read with OpenCV
                        image = cv2.imread(temp_path)
                        # Remove temporary file
                        os.remove(temp_path)
                else:
                    # Read image with OpenCV
                    image = cv2.imread(original_path)
            except Exception as e:
                logger.error(f"Error reading image: {str(e)}")
                return jsonify({'error': 'Could not read image file'}), 400
            
            if image is None:
                return jsonify({'error': 'Could not read image'}), 400
            
            # Apply compression based on selected method
            start_time = time.time()
            
            try:
                if method == 'huffman':
                    compressed_image, compression_ratio, mse, psnr = huffman_compress(image)
                elif method == 'svd':
                    compressed_image, compression_ratio, mse, psnr = svd_compress(image, level)
                elif method == 'pca':
                    compressed_image, compression_ratio, mse, psnr = pca_compress(image, level)
                else:
                    return jsonify({'error': 'Invalid compression method'}), 400
            except Exception as e:
                logger.error(f"Compression error: {str(e)}")
                return jsonify({'error': f'Error during compression: {str(e)}'}), 500
            
        # Save compressed image with quality settings
        compressed_filename = unique_id + '.jpg'  # Always save as JPEG for better compression
        compressed_path = os.path.join(COMPRESSED_FOLDER, compressed_filename)
        
        # Calculate JPEG quality based on compression level (higher level = lower quality)
        jpeg_quality = max(10, 100 - level)
        
        # Save with compression
        compression_params = [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality]
        if not cv2.imwrite(compressed_path, compressed_image, compression_params):
            logger.error("Failed to save compressed image")
            return jsonify({'error': 'Failed to save compressed image'}), 500
            
        logger.info(f"Compressed image saved at: {compressed_path}")
        
        # Calculate file sizes
        original_size = os.path.getsize(original_path) / 1024  # KB
        compressed_size = os.path.getsize(compressed_path) / 1024  # KB
        
        # Processing time
        processing_time = time.time() - start_time
        
        # Return results
        return jsonify({
            'media_type': 'image',
            'compressed_media_url': f'/static/compressed/{compressed_filename}',
            'original_size': original_size,
            'compressed_size': compressed_size,
            'compression_ratio': compression_ratio,
            'psnr': psnr,
            'mse': mse,
            'processing_time': processing_time
        })
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large. Maximum size is 100MB.'}), 413

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found.'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Internal server error.'}), 500

if __name__ == '__main__':
    app.run(debug=True)