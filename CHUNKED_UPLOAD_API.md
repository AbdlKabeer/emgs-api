# Chunked Upload API - YouTube-Style Upload

## Overview
This chunked upload system allows large files to be uploaded in small pieces (chunks), similar to YouTube's upload mechanism. This provides:
- **Resume capability**: Failed uploads can be resumed from the last successful chunk
- **Better reliability**: Network interruptions don't require restarting the entire upload
- **Progress tracking**: Real-time progress updates
- **Memory efficiency**: Server processes small chunks instead of entire file

## API Endpoints

### 1. Initialize Upload
**POST** `/api/v2/file/chunked/init`

Initialize a new chunked upload session.

**Request Body:**
```json
{
  "filename": "video.mp4",
  "filesize": 52428800,
  "mimetype": "video/mp4",
  "totalChunks": 20
}
```

**Response:**
```json
{
  "message": "Chunked upload initialized successfully",
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Upload session initialized",
    "expiresIn": 600
  }
}
```

### 2. Upload Chunk
**POST** `/api/v2/file/chunked/chunk`

Upload a single chunk of the file.

**Form Data:**
- `chunk`: File blob/buffer (binary)
- `uploadId`: Upload session ID
- `chunkIndex`: Index of this chunk (0-based)

**Response:**
```json
{
  "message": "Chunk uploaded successfully",
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "chunkIndex": 5,
    "receivedChunks": 6,
    "totalChunks": 20,
    "progress": 30.00,
    "isComplete": false
  }
}
```

### 3. Complete Upload
**POST** `/api/v2/file/chunked/complete`

Merge all chunks and upload to Cloudinary.

**Request Body:**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/your-cloud/video/upload/v123456/course-content/video.mp4",
    "public_id": "course-content/1234567890_video",
    "format": "mp4",
    "size": 52428800,
    "duration": 120.5,
    "resource_type": "video"
  }
}
```

### 4. Get Upload Status
**GET** `/api/v2/file/chunked/status/:uploadId`

Check the current status of an upload.

**Response:**
```json
{
  "message": "Upload status retrieved",
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "video.mp4",
    "receivedChunks": 15,
    "totalChunks": 20,
    "progress": 75.00,
    "isComplete": false,
    "isExpired": false,
    "missingChunks": [7, 12, 16, 17, 18]
  }
}
```

### 5. Cancel Upload
**DELETE** `/api/v2/file/chunked/cancel/:uploadId`

Cancel an upload and clean up all temporary files.

**Response:**
```json
{
  "message": "Upload cancelled and cleaned up",
  "data": {
    "uploadId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Client Implementation Examples

### JavaScript/React Example

```javascript
class ChunkedUploader {
  constructor(file, chunkSize = 2 * 1024 * 1024) { // 2MB chunks
    this.file = file;
    this.chunkSize = chunkSize;
    this.totalChunks = Math.ceil(file.size / chunkSize);
    this.uploadId = null;
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
  }

  async start() {
    try {
      // 1. Initialize upload
      const initResponse = await fetch('/api/v2/file/chunked/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: this.file.name,
          filesize: this.file.size,
          mimetype: this.file.type,
          totalChunks: this.totalChunks
        })
      });

      const initData = await initResponse.json();
      this.uploadId = initData.data.uploadId;

      // 2. Upload chunks
      for (let i = 0; i < this.totalChunks; i++) {
        await this.uploadChunk(i);
      }

      // 3. Complete upload
      const completeResponse = await fetch('/api/v2/file/chunked/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: this.uploadId })
      });

      const completeData = await completeResponse.json();
      
      if (this.onComplete) {
        this.onComplete(completeData.data);
      }

      return completeData.data;
    } catch (error) {
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  async uploadChunk(chunkIndex) {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.file.size);
    const chunk = this.file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('uploadId', this.uploadId);
    formData.append('chunkIndex', chunkIndex);

    const response = await fetch('/api/v2/file/chunked/chunk', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (this.onProgress) {
      this.onProgress(data.data.progress, chunkIndex + 1, this.totalChunks);
    }

    return data;
  }

  async resume() {
    // Get current status
    const statusResponse = await fetch(`/api/v2/file/chunked/status/${this.uploadId}`);
    const statusData = await statusResponse.json();

    // Upload missing chunks
    for (const chunkIndex of statusData.data.missingChunks) {
      await this.uploadChunk(chunkIndex);
    }

    // Complete upload
    const completeResponse = await fetch('/api/v2/file/chunked/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: this.uploadId })
    });

    return await completeResponse.json();
  }

  async cancel() {
    if (!this.uploadId) return;

    await fetch(`/api/v2/file/chunked/cancel/${this.uploadId}`, {
      method: 'DELETE'
    });
  }
}

// Usage
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  
  const uploader = new ChunkedUploader(file);
  
  uploader.onProgress = (progress, current, total) => {
    console.log(`Progress: ${progress}% (${current}/${total} chunks)`);
    // Update UI progress bar
  };
  
  uploader.onComplete = (result) => {
    console.log('Upload complete!', result);
    // Display video URL: result.url
  };
  
  uploader.onError = (error) => {
    console.error('Upload failed:', error);
    // Show error message
  };

  try {
    const result = await uploader.start();
    console.log('Video URL:', result.url);
  } catch (error) {
    console.error('Upload error:', error);
  }
});
```

### React Native Example

```javascript
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

class RNChunkedUploader {
  constructor(uri, filename, filesize, mimetype, chunkSize = 2 * 1024 * 1024) {
    this.uri = uri;
    this.filename = filename;
    this.filesize = filesize;
    this.mimetype = mimetype;
    this.chunkSize = chunkSize;
    this.totalChunks = Math.ceil(filesize / chunkSize);
    this.uploadId = null;
  }

  async start(onProgress) {
    // 1. Initialize
    const initResponse = await fetch('https://your-api.com/api/v2/file/chunked/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: this.filename,
        filesize: this.filesize,
        mimetype: this.mimetype,
        totalChunks: this.totalChunks
      })
    });

    const initData = await initResponse.json();
    this.uploadId = initData.data.uploadId;

    // 2. Upload chunks
    for (let i = 0; i < this.totalChunks; i++) {
      await this.uploadChunk(i, onProgress);
    }

    // 3. Complete
    const completeResponse = await fetch('https://your-api.com/api/v2/file/chunked/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: this.uploadId })
    });

    return await completeResponse.json();
  }

  async uploadChunk(chunkIndex, onProgress) {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, this.filesize);

    const uploadResult = await FileSystem.uploadAsync(
      'https://your-api.com/api/v2/file/chunked/chunk',
      this.uri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'chunk',
        parameters: {
          uploadId: this.uploadId,
          chunkIndex: chunkIndex.toString()
        },
        headers: {
          'Content-Range': `bytes ${start}-${end-1}/${this.filesize}`
        }
      }
    );

    const result = JSON.parse(uploadResult.body);
    
    if (onProgress) {
      onProgress(result.data.progress);
    }

    return result;
  }
}

// Usage in React Native
async function pickAndUploadVideo() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'video/*',
  });

  if (result.type === 'success') {
    const uploader = new RNChunkedUploader(
      result.uri,
      result.name,
      result.size,
      result.mimeType || 'video/mp4'
    );

    const uploadResult = await uploader.start((progress) => {
      console.log(`Upload progress: ${progress}%`);
      // Update progress bar
    });

    console.log('Video uploaded:', uploadResult.data.url);
  }
}
```

### cURL Examples

```bash
# 1. Initialize upload
curl -X POST https://your-api.com/api/v2/file/chunked/init \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "video.mp4",
    "filesize": 52428800,
    "mimetype": "video/mp4",
    "totalChunks": 20
  }'

# 2. Upload chunk (repeat for each chunk)
curl -X POST https://your-api.com/api/v2/file/chunked/chunk \
  -F "chunk=@chunk_0.bin" \
  -F "uploadId=550e8400-e29b-41d4-a716-446655440000" \
  -F "chunkIndex=0"

# 3. Check status
curl https://your-api.com/api/v2/file/chunked/status/550e8400-e29b-41d4-a716-446655440000

# 4. Complete upload
curl -X POST https://your-api.com/api/v2/file/chunked/complete \
  -H "Content-Type: application/json" \
  -d '{
    "uploadId": "550e8400-e29b-41d4-a716-446655440000"
  }'

# 5. Cancel upload
curl -X DELETE https://your-api.com/api/v2/file/chunked/cancel/550e8400-e29b-41d4-a716-446655440000
```

## Configuration

### Chunk Size Recommendations
- **Mobile 3G/4G**: 1-2 MB chunks
- **WiFi**: 2-5 MB chunks
- **Desktop/Fast connection**: 5-10 MB chunks

### Timeout Settings
- Default session timeout: 10 minutes
- Can be adjusted in `chunked-upload.controller.js`

### File Size Limits
- Maximum file size: 100MB (configurable)
- Maximum chunk size: 5MB (configurable in routes)

## Production Considerations

1. **Storage**: Current implementation uses filesystem. For production, consider:
   - Redis for session metadata
   - S3/Cloud Storage for chunk storage
   
2. **Cleanup**: Set up a cron job to clean expired sessions:
   ```javascript
   // In your server or separate worker
   setInterval(() => {
     chunkedUploadController.cleanupExpiredSessions();
   }, 60 * 60 * 1000); // Every hour
   ```

3. **Authentication**: Add authentication middleware to routes as needed

4. **Rate Limiting**: Implement rate limiting to prevent abuse

5. **Monitoring**: Track upload metrics and failures

## Error Handling

The API returns appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid parameters, missing chunks, expired session)
- `500`: Server error

Always check the response status and handle errors appropriately in your client code.
