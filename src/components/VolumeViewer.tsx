import { useEffect, useRef } from 'react';
import { VolumeRenderer } from '../utils/volumeRenderer';
import { BodyRegion } from '../types';

interface VolumeViewerProps {
  volumeData: Float32Array;
  dimensions: [number, number, number];
  bodyRegion: BodyRegion;
}

export function VolumeViewer({ volumeData, dimensions, bodyRegion }: VolumeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<VolumeRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    rendererRef.current = new VolumeRenderer(containerRef.current);
    rendererRef.current.renderVolume(volumeData, dimensions, bodyRegion);

    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
    };
  }, [volumeData, dimensions, bodyRegion]);

  return (
    <div className="volume-viewer">
      <div className="volume-viewer-header">
        <h3>3D Volume Rendering</h3>
        <div className="region-badge">{bodyRegion.replace('_', ' ').toUpperCase()}</div>
      </div>
      <div
        ref={containerRef}
        className="volume-container"
        style={{ width: '100%', height: '600px' }}
      />
      <div className="volume-instructions">
        <p><strong>Controls:</strong></p>
        <ul>
          <li>Left click + drag: Rotate</li>
          <li>Right click + drag: Pan</li>
          <li>Scroll: Zoom</li>
        </ul>
      </div>
    </div>
  );
}
