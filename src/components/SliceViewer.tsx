import { useState, useEffect, useRef } from 'react';

interface SliceViewerProps {
  slices: ImageData[];
  metadata: any;
}

export function SliceViewer({ slices, metadata }: SliceViewerProps) {
  const [currentSlice, setCurrentSlice] = useState(0);
  const [brightness, setBrightness] = useState(1.0);
  const [contrast, setContrast] = useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (slices.length > 0) {
      setCurrentSlice(Math.floor(slices.length / 2));
    }
  }, [slices]);

  useEffect(() => {
    if (canvasRef.current && slices.length > 0 && currentSlice < slices.length) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imageData = slices[currentSlice];
      canvas.width = imageData.width;
      canvas.height = imageData.height;

      const adjustedImageData = ctx.createImageData(imageData.width, imageData.height);
      const data = imageData.data;
      const adjustedData = adjustedImageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        adjustedData[i] = Math.min(255, Math.max(0, (r - 128) * contrast + 128 + (brightness - 1) * 128));
        adjustedData[i + 1] = Math.min(255, Math.max(0, (g - 128) * contrast + 128 + (brightness - 1) * 128));
        adjustedData[i + 2] = Math.min(255, Math.max(0, (b - 128) * contrast + 128 + (brightness - 1) * 128));
        adjustedData[i + 3] = a;
      }

      ctx.putImageData(adjustedImageData, 0, 0);
    }
  }, [currentSlice, slices, brightness, contrast]);

  const handleSliceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentSlice(parseInt(e.target.value));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    setCurrentSlice(prev => Math.max(0, Math.min(slices.length - 1, prev + delta)));
  };

  if (slices.length === 0) {
    return <div className="slice-viewer-empty">No slices to display</div>;
  }

  return (
    <div className="slice-viewer">
      <div className="slice-viewer-header">
        <h3>2D Slice Viewer</h3>
        <div className="slice-info">
          Slice {currentSlice + 1} of {slices.length}
        </div>
      </div>

      <div className="canvas-container" onWheel={handleWheel}>
        <canvas ref={canvasRef} className="slice-canvas" />
      </div>

      <div className="viewer-controls">
        <div className="control-group">
          <label>
            Slice Position
            <input
              type="range"
              min="0"
              max={slices.length - 1}
              value={currentSlice}
              onChange={handleSliceChange}
              className="slider"
            />
          </label>
        </div>

        <div className="control-group">
          <label>
            Brightness
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={brightness}
              onChange={(e) => setBrightness(parseFloat(e.target.value))}
              className="slider"
            />
          </label>
        </div>

        <div className="control-group">
          <label>
            Contrast
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={contrast}
              onChange={(e) => setContrast(parseFloat(e.target.value))}
              className="slider"
            />
          </label>
        </div>

        <button
          className="reset-btn"
          onClick={() => {
            setBrightness(1.0);
            setContrast(1.0);
          }}
        >
          Reset View
        </button>
      </div>

      {metadata && (
        <div className="metadata-panel">
          <h4>DICOM Metadata</h4>
          <div className="metadata-grid">
            {metadata.patientName && <div><strong>Patient:</strong> {metadata.patientName}</div>}
            {metadata.studyDate && <div><strong>Study Date:</strong> {metadata.studyDate}</div>}
            {metadata.modality && <div><strong>Modality:</strong> {metadata.modality}</div>}
            {metadata.bodyPartExamined && <div><strong>Body Part:</strong> {metadata.bodyPartExamined}</div>}
            {metadata.seriesDescription && <div><strong>Series:</strong> {metadata.seriesDescription}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
