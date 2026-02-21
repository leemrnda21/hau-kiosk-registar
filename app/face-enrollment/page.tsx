'use client';

import React, { useRef, useState, useEffect } from 'react';
import { detectFaceInImage, loadModels, calculate3DDepth } from '@/lib/facial-recognition-pretrained';
import { enrollNewFace, findFaceByStudentId } from '@/lib/mock-face-db';
import { setCameraDirection } from '@/lib/camera-depth';

declare global {
  interface Window {
    faceapi: any;
  }
}

export default function FaceEnrollmentPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [studentId, setStudentId] = useState('20876916');
  const [name, setName] = useState('Student 20876916');
  const [email, setEmail] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraDirection, setCameraDir] = useState<'left' | 'right' | 'center'>('center');
  const [capturedFaceCount, setCapturedFaceCount] = useState(0);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([]);
  const [enrolledFacesDebug, setEnrolledFacesDebug] = useState<string | null>(null);

  useEffect(() => {
    // Load face-api.js script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
    script.async = true;
    script.onload = async () => {
      console.log('face-api.js loaded');
      const tfScript = document.createElement('script');
      tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js';
      tfScript.async = true;
      tfScript.onload = async () => {
        console.log('TensorFlow.js loaded');
        const backendScript = document.createElement('script');
        backendScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl@4.20.0/dist/tf-backend-webgl.min.js';
        backendScript.async = true;
        backendScript.onload = async () => {
          console.log('TensorFlow.js WebGL backend loaded, starting model load...');
          try {
            await loadModels();
            setModelsLoaded(true);
            console.log('Models loaded successfully');
          } catch (error) {
            console.error('Error loading models:', error);
            // Try again after 2 seconds
            setTimeout(async () => {
              try {
                await loadModels();
                setModelsLoaded(true);
              } catch (retryError) {
                console.error('Retry failed:', retryError);
              }
            }, 2000);
          }
        };
        backendScript.onerror = () => console.error('Failed to load WebGL backend');
        document.body.appendChild(backendScript);
      };
      tfScript.onerror = () => console.error('Failed to load TensorFlow.js');
      document.body.appendChild(tfScript);
    };
    script.onerror = () => console.error('Failed to load face-api.js');
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('faceEnrollments') || '{}';
      setEnrolledFacesDebug(JSON.stringify(JSON.parse(raw), null, 2));
    } catch (e) {
      setEnrolledFacesDebug('{}');
    }
  }, []);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsStreaming(true);
        }
      } catch (error) {
        console.error('Camera access denied:', error);
        alert('Please allow camera access to enroll your face.');
      }
    };

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const captureForEnrollment = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setEnrollmentStatus('Processing face capture...');
    
    try {
      // Check if models are loaded
      if (!window.faceapi || !window.faceapi.nets.tinyFaceDetector) {
        setEnrollmentStatus('❌ Face detection model not loaded. Waiting for models...');
        setIsProcessing(false);
        return;
      }

      const context = canvasRef.current.getContext('2d');
      if (!context) {
        setEnrollmentStatus('❌ Canvas context error.');
        setIsProcessing(false);
        return;
      }

      // Draw video frame to canvas
      try {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
      } catch (drawError) {
        console.error('Canvas draw error:', drawError);
        setEnrollmentStatus('❌ Failed to capture video frame.');
        setIsProcessing(false);
        return;
      }

      // Detect faces with timeout
      let detections = null;
      try {
        const detectionTimeout = new Promise((resolve) => {
          setTimeout(() => resolve(null), 8000); // 8 second timeout
        });

        const detectionPromise = detectFaceInImage(canvasRef.current);
        detections = await Promise.race([detectionPromise, detectionTimeout]);
      } catch (detectionError) {
        console.error('Face detection error:', detectionError);
        setEnrollmentStatus(`❌ Face detection error: ${String(detectionError).substring(0, 50)}`);
        setIsProcessing(false);
        return;
      }

      if (!detections) {
        setEnrollmentStatus('❌ Face detection timed out. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (detections.length === 0) {
        setEnrollmentStatus('❌ No face detected. Please look at the camera and try again.');
        setIsProcessing(false);
        return;
      }

      if (detections.length > 1) {
        setEnrollmentStatus('❌ Multiple faces detected. Please ensure only you are in the frame.');
        setIsProcessing(false);
        return;
      }

      try {
        const detection = detections[0];
        
        if (!detection.descriptor) {
          setEnrollmentStatus('❌ Failed to extract face descriptor.');
          setIsProcessing(false);
          return;
        }

        const faceDescriptor = Array.from(detection.descriptor) as number[];
        
        if (!detection.landmarks) {
          setEnrollmentStatus('❌ Failed to extract facial landmarks.');
          setIsProcessing(false);
          return;
        }

        // Landmarks can be an array or have a positions() method
        const landmarks = typeof detection.landmarks.positions === 'function' 
          ? detection.landmarks.positions() 
          : detection.landmarks;
        
        const depthData = calculate3DDepth(landmarks);

        // Store the descriptor for averaging
        const newDescriptors = [...capturedDescriptors, faceDescriptor];
        setCapturedDescriptors(newDescriptors);
        setCapturedFaceCount(prev => prev + 1);
        
        if (newDescriptors.length < 3) {
          const remaining = 3 - newDescriptors.length;
          setEnrollmentStatus(`✓ Face ${newDescriptors.length}/3 captured successfully. Please capture ${remaining} more angle${remaining !== 1 ? 's' : ''}.`);
        } else {
          // After 3 captures, average the descriptors and enroll
          try {
            // Calculate average descriptor from all 3 captures
            const averagedDescriptor = new Array(128).fill(0);
            for (let i = 0; i < 128; i++) {
              let sum = 0;
              for (const descriptor of newDescriptors) {
                sum += descriptor[i] || 0;
              }
              averagedDescriptor[i] = sum / newDescriptors.length;
            }

            // Store enrollment with email
            const success = enrollNewFace(studentId, name, averagedDescriptor, depthData);
            
            console.log('Enrollment result:', { success, studentId, name, email });
            
            // Also save email to localStorage for retrieval during login
            if (success) {
              const enrollments = JSON.parse(localStorage.getItem('faceEnrollments') || '{}');
              enrollments[studentId] = { name, email };
              localStorage.setItem('faceEnrollments', JSON.stringify(enrollments));
              console.log('Saved to localStorage:', enrollments);
            }
            
            if (success) {
              setEnrollmentStatus(`✓ Enrollment Successful! Your face has been added to the database. Student ID: ${studentId}, Email: ${email}`);
              setCapturedFaceCount(0);
              setCapturedDescriptors([]);
              setStudentId('');
              setName('');
              setEmail('');
            } else {
              setEnrollmentStatus(`❌ Enrollment failed. Student ID ${studentId} may already be enrolled or is invalid.`);
            }
          } catch (enrollError) {
            console.error('Enrollment error:', enrollError);
            setEnrollmentStatus(`❌ Enrollment failed: ${String(enrollError).substring(0, 50)}`);
          }
        }
      } catch (processError) {
        console.error('Processing error:', processError);
        setEnrollmentStatus(`❌ Processing error: ${String(processError).substring(0, 50)}`);
        setIsProcessing(false);
        return;
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      setEnrollmentStatus(`❌ Unexpected error: ${String(error).substring(0, 60)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCameraDirectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const direction = e.target.value as 'left' | 'right' | 'center';
    setCameraDir(direction);
    setCameraDirection(direction);
  };

  const resetEnrollment = () => {
    setCapturedFaceCount(0);
    setEnrollmentStatus('');
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20, border: '1px solid #eee', borderRadius: 8 }}>
      <h2>Face Enrollment System</h2>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>Enroll your face to enable identity verification for document access</p>

      {/* Student Info Input */}
      <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <label htmlFor="student-id">Student ID:</label>
        <input
          id="student-id"
          type="text"
          value={studentId}
          onChange={e => setStudentId(e.target.value)}
          placeholder="Enter your student ID"
          style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 4, border: '1px solid #ccc' }}
        />
        
        <label htmlFor="student-name">Full Name:</label>
        <input
          id="student-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Enter your full name"
          style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 4, border: '1px solid #ccc' }}
        />
        
        <label htmlFor="student-email">Email:</label>
        <input
          id="student-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Enter your school email"
          style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
      </div>

      {/* Camera Direction Settings */}
      <div style={{ marginBottom: 16 }}>
        <label htmlFor="camera-direction">Camera Direction:</label>
        <select
          id="camera-direction"
          value={cameraDirection}
          onChange={handleCameraDirectionChange}
          style={{ marginLeft: 8, padding: 6 }}
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      {/* Camera Feed */}
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%',
            maxWidth: 400,
            borderRadius: 8,
            border: '2px solid #ccc',
            transform: cameraDirection === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
          }}
        />
      </div>

      {/* Hidden Canvas for Capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Capture Progress */}
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 'bold' }}>
          Captures: {capturedFaceCount}/3
        </p>
        <div style={{ width: '100%', height: 8, backgroundColor: '#ddd', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${(capturedFaceCount / 3) * 100}%`, height: '100%', backgroundColor: '#4CAF50', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Capture Button */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <button
          onClick={captureForEnrollment}
          disabled={isProcessing || !studentId || !name || !isStreaming || !modelsLoaded}
          style={{
            padding: '10px 20px',
            backgroundColor: isProcessing || !studentId || !name || !modelsLoaded ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: isProcessing || !studentId || !name || !modelsLoaded ? 'not-allowed' : 'pointer',
            marginRight: 8,
          }}
        >
          {!modelsLoaded ? 'Loading models...' : isProcessing ? 'Processing...' : `Capture Face (${capturedFaceCount}/3)`}
        </button>
        
        <button
          onClick={resetEnrollment}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      {/* Status Messages */}
      {enrollmentStatus && (
        <div style={{
          marginTop: 24,
          padding: 12,
          backgroundColor: enrollmentStatus.includes('❌') ? '#ffebee' : '#e8f5e9',
          borderLeft: `4px solid ${enrollmentStatus.includes('❌') ? '#f44336' : '#4CAF50'}`,
          borderRadius: 4,
        }}>
          <p style={{ margin: 0, fontSize: 14 }}>{enrollmentStatus}</p>
          <p style={{ margin: '8px 0 0 0', fontSize: 11, color: '#666' }}>
            (Open browser console with F12 for detailed logs)
          </p>
        </div>
      )}

      {/* Instructions */}
      <div style={{ marginTop: 24, padding: 12, backgroundColor: '#f0f8ff', borderRadius: 4 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 14 }}>Enrollment Instructions:</h3>
        <ul style={{ margin: '8px 0', paddingLeft: 20, fontSize: 12 }}>
          <li>Enter your Student ID and Full Name</li>
          <li>Capture 3 different angles: Face Center, Face Left, Face Right</li>
          <li>Ensure good lighting and clear face visibility</li>
          <li>Once enrolled, your face will be verified for document access</li>
          <li>The system uses 3D depth detection to prevent spoofing</li>
        </ul>
      </div>

      {/* Camera Status */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: isStreaming ? 'green' : 'red' }}>
          Camera Status: {isStreaming ? '✓ Active' : '✗ Inactive'}
        </p>
        <p style={{ fontSize: 12, color: modelsLoaded ? 'green' : 'orange' }}>
          Models Status: {modelsLoaded ? '✓ Loaded' : '⏳ Loading... (this may take 20-30 seconds on first load)'}
        </p>
      </div>

      {/* Debug: Show enrolled faces */}
      <div style={{ marginTop: 24, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4, fontSize: 12 }}>
        <h4 style={{ margin: '0 0 8px 0' }}>🔍 Debug - Enrolled Faces in Storage:</h4>
        <pre style={{ margin: 0, padding: 8, backgroundColor: '#fff', borderRadius: 4, overflow: 'auto', maxHeight: 150 }}>
          {enrolledFacesDebug ? enrolledFacesDebug : null}
        </pre>
      </div>
    </div>
  );
}
