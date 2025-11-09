import { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { SliceViewer } from './components/SliceViewer';
import { VolumeViewer } from './components/VolumeViewer';
import { parseDicomFile, detectBodyRegion, getPixelData } from './utils/dicomParser';
import { BodyRegion, DicomMetadata } from './types';
import { supabase } from './lib/supabase';
import './App.css';

interface ProcessedData {
  slices: ImageData[];
  volumeData: Float32Array;
  dimensions: [number, number, number];
  bodyRegion: BodyRegion;
  metadata: DicomMetadata;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [view, setView] = useState<'2d' | '3d' | 'both'>('both');

  useEffect(() => {
    checkAuth();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
  };

  const handleSignIn = async () => {
    const email = prompt('Enter your email:');
    const password = prompt('Enter your password:');

    if (email && password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert('Sign in failed. Try signing up first.');
      }
    }
  };

  const handleSignUp = async () => {
    const email = prompt('Enter your email:');
    const password = prompt('Enter your password (min 6 characters):');

    if (email && password) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert('Sign up failed: ' + error.message);
      } else {
        alert('Account created! You can now sign in.');
      }
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProcessedData(null);
  };

  const handleUploadComplete = async (files: File[], seriesName: string) => {
    setIsProcessing(true);

    try {
      const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name));

      const firstFileBuffer = await sortedFiles[0].arrayBuffer();
      const metadata = parseDicomFile(firstFileBuffer);
      const bodyRegion = detectBodyRegion(metadata, seriesName);

      const slices: ImageData[] = [];
      const pixelDataArrays: Uint16Array[] = [];
      let width = 0;
      let height = 0;

      for (const file of sortedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pixelData = getPixelData(arrayBuffer);

        if (pixelData) {
          const localMetadata = parseDicomFile(arrayBuffer);
          width = localMetadata.columns || 512;
          height = localMetadata.rows || 512;

          pixelDataArrays.push(pixelData);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            const imageData = ctx.createImageData(width, height);
            const data = imageData.data;

            const min = Math.min(...Array.from(pixelData));
            const max = Math.max(...Array.from(pixelData));
            const range = max - min || 1;

            for (let i = 0; i < pixelData.length; i++) {
              const normalized = ((pixelData[i] - min) / range) * 255;
              const idx = i * 4;
              data[idx] = normalized;
              data[idx + 1] = normalized;
              data[idx + 2] = normalized;
              data[idx + 3] = 255;
            }

            slices.push(imageData);
          }
        }
      }

      const depth = pixelDataArrays.length;
      const volumeSize = width * height * depth;
      const volumeData = new Float32Array(volumeSize);

      let globalMin = Infinity;
      let globalMax = -Infinity;

      for (const arr of pixelDataArrays) {
        for (let i = 0; i < arr.length; i++) {
          if (arr[i] < globalMin) globalMin = arr[i];
          if (arr[i] > globalMax) globalMax = arr[i];
        }
      }

      const range = globalMax - globalMin || 1;

      for (let z = 0; z < depth; z++) {
        const sliceData = pixelDataArrays[z];
        for (let i = 0; i < sliceData.length; i++) {
          const normalized = (sliceData[i] - globalMin) / range;
          volumeData[z * width * height + i] = normalized;
        }
      }

      if (isAuthenticated) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: seriesError } = await supabase
            .from('dicom_series')
            .insert({
              user_id: user.id,
              series_name: seriesName,
              body_region: bodyRegion,
              num_slices: files.length,
              metadata: metadata
            })
            .select()
            .maybeSingle();

          if (seriesError) {
            console.error('Error saving series:', seriesError);
          }
        }
      }

      setProcessedData({
        slices,
        volumeData,
        dimensions: [width, height, depth],
        bodyRegion,
        metadata
      });
    } catch (error) {
      console.error('Error processing DICOM files:', error);
      alert('Error processing DICOM files. Please check the console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <svg className="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h1>MediVision XR</h1>
          </div>
          <div className="auth-section">
            {isAuthenticated ? (
              <button onClick={handleSignOut} className="auth-btn">Sign Out</button>
            ) : (
              <>
                <button onClick={handleSignIn} className="auth-btn">Sign In</button>
                <button onClick={handleSignUp} className="auth-btn primary">Sign Up</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        {!processedData ? (
          <div className="welcome-section">
            <div className="hero">
              <h2>Advanced Medical Imaging Visualization</h2>
              <p>Upload DICOM files to view interactive 2D slices and 3D volume renderings</p>
              <div className="features">
                <div className="feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3>2D Slice Viewing</h3>
                  <p>Navigate through cross-sectional images with adjustable brightness and contrast</p>
                </div>
                <div className="feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                  </svg>
                  <h3>3D Volume Rendering</h3>
                  <p>Interactive 3D visualization with region-specific presets</p>
                </div>
                <div className="feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <h3>Secure Storage</h3>
                  <p>Your medical data is securely stored and accessible only to you</p>
                </div>
              </div>
            </div>
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>
        ) : (
          <div className="viewer-section">
            <div className="viewer-controls-bar">
              <button
                className={view === '2d' ? 'active' : ''}
                onClick={() => setView('2d')}
              >
                2D View
              </button>
              <button
                className={view === '3d' ? 'active' : ''}
                onClick={() => setView('3d')}
              >
                3D View
              </button>
              <button
                className={view === 'both' ? 'active' : ''}
                onClick={() => setView('both')}
              >
                Split View
              </button>
              <button
                className="new-upload-btn"
                onClick={() => setProcessedData(null)}
              >
                New Upload
              </button>
            </div>

            <div className={`viewer-grid ${view}`}>
              {(view === '2d' || view === 'both') && (
                <SliceViewer
                  slices={processedData.slices}
                  metadata={processedData.metadata}
                />
              )}
              {(view === '3d' || view === 'both') && (
                <VolumeViewer
                  volumeData={processedData.volumeData}
                  dimensions={processedData.dimensions}
                  bodyRegion={processedData.bodyRegion}
                />
              )}
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="processing-overlay">
            <div className="spinner"></div>
            <p>Processing DICOM files...</p>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>MediVision XR - Making Medical Imaging Accessible</p>
        <p className="footer-subtext">Affordable, Interactive, AI-Powered 3D Medical Training</p>
      </footer>
    </div>
  );
}

export default App;
