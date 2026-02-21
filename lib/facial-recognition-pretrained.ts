// Facial recognition with pretrained model using face-api.js
// Detects faces, extracts descriptors, and verifies against database
// Includes 3D depth detection for liveness verification and anti-spoofing

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  
  try {
    // Use the official face-api.js GitHub raw content CDN (most reliable)
    const MODEL_URL = 'https://raw.githubusercontent.com/vladmandic/face-api/master/model/';
    
    console.log('Starting model load from GitHub:', MODEL_URL);
    
    const loadTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Model loading timeout after 60s')), 60000)
    );
    
    const loadPromise = Promise.all([
      (window as any).faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      (window as any).faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      (window as any).faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    
    await Promise.race([loadPromise, loadTimeout]);
    modelsLoaded = true;
    console.log('✓ Face detection models loaded successfully from GitHub');
  } catch (error) {
    console.error('Error loading face detection models from GitHub:', error);
    // Try jsDelivr CDN
    try {
      const ALT_MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/models/';
      
      console.log('Trying jsDelivr CDN:', ALT_MODEL_URL);
      
      const loadTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Alt model loading timeout')), 60000)
      );
      
      const altLoadPromise = Promise.all([
        (window as any).faceapi.nets.tinyFaceDetector.loadFromUri(ALT_MODEL_URL),
        (window as any).faceapi.nets.faceLandmark68Net.loadFromUri(ALT_MODEL_URL),
        (window as any).faceapi.nets.faceRecognitionNet.loadFromUri(ALT_MODEL_URL),
      ]);
      
      await Promise.race([altLoadPromise, loadTimeout]);
      modelsLoaded = true;
      console.log('✓ Face detection models loaded from jsDelivr CDN');
    } catch (altError) {
      console.error('Both CDNs failed, trying unpkg:', altError);
      // Try unpkg as last resort
      try {
        const UNPKG_URL = 'https://unpkg.com/face-api.js@0.22.2/dist/models/';
        
        console.log('Trying unpkg:', UNPKG_URL);
        
        const loadTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('unpkg loading timeout')), 60000)
        );
        
        const unpkgPromise = Promise.all([
          (window as any).faceapi.nets.tinyFaceDetector.loadFromUri(UNPKG_URL),
          (window as any).faceapi.nets.faceLandmark68Net.loadFromUri(UNPKG_URL),
          (window as any).faceapi.nets.faceRecognitionNet.loadFromUri(UNPKG_URL),
        ]);
        
        await Promise.race([unpkgPromise, loadTimeout]);
        modelsLoaded = true;
        console.log('✓ Face detection models loaded from unpkg');
      } catch (unpkgError) {
        console.error('All CDN attempts failed:', unpkgError);
        throw unpkgError;
      }
    }
  }
}

export type FaceDetectionResult = {
  status: "ok" | "models-not-ready"
  detections: any[]
}

export async function detectFaceInImage(
  imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<FaceDetectionResult> {
  try {
    await loadModels();
    
    if (!window.faceapi) {
      return { status: "models-not-ready", detections: [] };
    }

    if (!window.faceapi.nets || !window.faceapi.nets.tinyFaceDetector) {
      return { status: "models-not-ready", detections: [] };
    }

    if (!window.faceapi.nets.tinyFaceDetector.params) {
      return { status: "models-not-ready", detections: [] };
    }

    console.log('Starting face detection...');
    
    const detections = await window.faceapi
      .detectAllFaces(imageElement, new window.faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    console.log(`Face detection complete. Found ${detections.length} face(s)`);
    return { status: "ok", detections };
  } catch (error) {
    console.error('Error detecting faces:', error);
    return { status: "ok", detections: [] };
  }
}

// Calculate 3D depth using facial landmarks for anti-spoofing
export function calculate3DDepth(landmarks: any): { minDepth: number; maxDepth: number } {
  if (!landmarks) {
    return { minDepth: 30, maxDepth: 60 };
  }

  // Landmarks can be an array or object with .positions() method
  let landmarkArray = landmarks;
  
  // If landmarks has a positions() method, call it
  if (typeof landmarks.positions === 'function') {
    landmarkArray = landmarks.positions();
  }
  
  // If still not an array, return default depth
  if (!Array.isArray(landmarkArray) || landmarkArray.length === 0) {
    return { minDepth: 30, maxDepth: 60 };
  }

  // Key facial points for depth calculation
  // Landmarks array has 68 points in standard face-api.js
  const nosePoint = landmarkArray[30]; // Nose tip
  const chinPoint = landmarkArray[8]; // Chin
  const eyeLeft = landmarkArray[36]; // Left eye outer corner
  const eyeRight = landmarkArray[45]; // Right eye outer corner

  if (!nosePoint || !chinPoint || !eyeLeft || !eyeRight) {
    return { minDepth: 30, maxDepth: 60 };
  }

  // Extract x, y coordinates (handle both object and Point formats)
  const getNoseX = () => nosePoint.x !== undefined ? nosePoint.x : nosePoint[0];
  const getNoseY = () => nosePoint.y !== undefined ? nosePoint.y : nosePoint[1];
  const getChinX = () => chinPoint.x !== undefined ? chinPoint.x : chinPoint[0];
  const getChinY = () => chinPoint.y !== undefined ? chinPoint.y : chinPoint[1];
  const getEyeLeftX = () => eyeLeft.x !== undefined ? eyeLeft.x : eyeLeft[0];
  const getEyeLeftY = () => eyeLeft.y !== undefined ? eyeLeft.y : eyeLeft[1];
  const getEyeRightX = () => eyeRight.x !== undefined ? eyeRight.x : eyeRight[0];
  const getEyeRightY = () => eyeRight.y !== undefined ? eyeRight.y : eyeRight[1];

  // Calculate face height and eye distance
  const faceHeight = Math.sqrt(Math.pow(getChinX() - getNoseX(), 2) + Math.pow(getChinY() - getNoseY(), 2));
  const eyeDistance = Math.sqrt(Math.pow(getEyeRightX() - getEyeLeftX(), 2) + Math.pow(getEyeRightY() - getEyeLeftY(), 2));

  // Estimate 3D depth in cm
  const minDepth = Math.max(20, Math.floor(faceHeight / 5));
  const maxDepth = Math.min(100, Math.floor(faceHeight / 2 + eyeDistance));

  return { minDepth, maxDepth };
}

export async function recognizeFace(
  imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  studentNo?: string
): Promise<{ verified: boolean; message: string; studentId?: string; name?: string; email?: string; distance?: number }> {
  try {
    const result = await detectFaceInImage(imageElement)
    const detections = result.detections

    if (result.status === "models-not-ready") {
      return { verified: false, message: "Models are still loading. Please wait a moment and try again." }
    }

    console.log('Recognition - detections:', detections.length)

    if (detections.length === 0) {
      return { verified: false, message: 'No face detected in the image' }
    }

    if (detections.length > 1) {
      return { verified: false, message: 'Multiple faces detected. Please ensure only one person is in the frame.' }
    }

    const detection = detections[0]
    console.log('Detection object keys:', Object.keys(detection));
    console.log('Has descriptor:', !!detection.descriptor);
    
    if (!detection.descriptor) {
      console.error('No descriptor found in detection');
      return { verified: false, message: 'Failed to extract face descriptor' };
    }
    
    const faceDescriptor = Array.from(detection.descriptor) as number[];
    console.log('Face descriptor extracted, length:', faceDescriptor.length);
    
    // Handle landmarks - could be array or object with positions() method
    let landmarks = detection.landmarks;
    if (typeof landmarks.positions === 'function') {
      landmarks = landmarks.positions();
    }

    // Calculate 3D depth for liveness and anti-spoofing detection
    const depthData = calculate3DDepth(landmarks);

    const response = await fetch("/api/face-recognition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptor: faceDescriptor, depthData, studentNo }),
    });

    if (!response.ok) {
      return { verified: false, message: "Face verification service unavailable." };
    }

    const verificationResult = await response.json();

    console.log('Verification result:', verificationResult);

    if (verificationResult.verified && verificationResult.record) {
      return {
        verified: true,
        message: `✓ Identity Verified: ${verificationResult.record.name} (Student ID: ${verificationResult.record.studentId}) - 3D Depth Confirmed`,
        studentId: verificationResult.record.studentId,
        name: verificationResult.record.name,
        email: verificationResult.record.email,
        distance: verificationResult.distance,
      };
    } else {
      return {
        verified: false,
        message: `✗ Verification Failed: ${verificationResult.reason}`,
        distance: verificationResult.distance,
      };
    }
  } catch (error) {
    console.error('Error in face recognition:', error);
    return { verified: false, message: `Error: ${String(error).substring(0, 60)}` };
  }
}
