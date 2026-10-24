import { gazeFromBlendshapes, poseFromMatrix } from './attention'

// Pin the WASM files to the same version as the npm package (npm install @mediapipe/tasks-vision@0.10.14).
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
// To avoid the external download in production, copy this file to public/models/ and use '/models/face_landmarker.task'.
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

/**
 * Loads the on-device face model (MediaPipe Face Landmarker). Video frames never leave the browser.
 * Rejects if the model cannot be loaded, and the caller falls back to tab/activity signals.
 */
export async function createFaceTracker() {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL)

  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  })

  let landmarker
  try {
    landmarker = await FaceLandmarker.createFromOptions(fileset, options('GPU'))
  } catch {
    landmarker = await FaceLandmarker.createFromOptions(fileset, options('CPU'))
  }

  return {
    detect(video, timestampMs) {
      const result = landmarker.detectForVideo(video, timestampMs)
      if (!result.faceLandmarks?.length) return { hasFace: false }
      const matrix = result.facialTransformationMatrixes?.[0]?.data
      const blendshapes = result.faceBlendshapes?.[0]?.categories
      return {
        hasFace: true,
        ...(matrix ? poseFromMatrix(matrix) : {}),
        gaze: blendshapes ? gazeFromBlendshapes(blendshapes) : 0,
      }
    },
    close() {
      landmarker.close()
    },
  }
}
