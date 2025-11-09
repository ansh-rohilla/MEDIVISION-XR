import { useState, useCallback } from 'react';
import JSZip from 'jszip';

interface FileUploadProps {
  onUploadComplete: (files: File[], seriesName: string) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [seriesName, setSeriesName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = async (fileList: FileList) => {
    if (!seriesName.trim()) {
      alert('Please enter a series name');
      return;
    }

    setIsProcessing(true);
    const files: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(file);

        for (const [filename, zipEntry] of Object.entries(zipContents.files)) {
          if (!zipEntry.dir && (filename.endsWith('.dcm') || !filename.includes('.'))) {
            const blob = await zipEntry.async('blob');
            const dicomFile = new File([blob], filename, { type: 'application/dicom' });
            files.push(dicomFile);
          }
        }
      } else if (file.name.endsWith('.dcm') || file.type === 'application/dicom') {
        files.push(file);
      }
    }

    if (files.length > 0) {
      onUploadComplete(files, seriesName);
    } else {
      alert('No DICOM files found');
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const fileList = e.dataTransfer.files;
    await processFiles(fileList);
  }, [seriesName]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h2>Upload DICOM Files</h2>
        <p>Upload individual DICOM files, folders, or ZIP archives</p>
      </div>

      <input
        type="text"
        placeholder="Enter series name (e.g., Chest CT, Abdomen MRI)"
        value={seriesName}
        onChange={(e) => setSeriesName(e.target.value)}
        className="series-input"
        disabled={isProcessing}
      />

      <div
        className={`dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="dropzone-content">
          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="dropzone-text">
            {isProcessing ? 'Processing files...' : 'Drag and drop DICOM files or folders here'}
          </p>
          <p className="dropzone-subtext">or</p>
          <label className="file-select-btn">
            <input
              type="file"
              multiple
              accept=".dcm,.zip,application/dicom"
              onChange={handleFileSelect}
              disabled={isProcessing}
              style={{ display: 'none' }}
            />
            Browse Files
          </label>
        </div>
      </div>

      <div className="supported-formats">
        <h4>Supported Formats:</h4>
        <ul>
          <li>.dcm files (DICOM)</li>
          <li>.zip archives containing DICOM files</li>
          <li>Multiple files or folders</li>
        </ul>
      </div>
    </div>
  );
}
