import { WASM_BASE } from "./assets";
import type { FaceGeometry } from "./geometry";
import { loadFaceModel, type ByteProgress } from "./loader";

/**
 * The face landmarker (plan §3.2, §5.2): MediaPipe's Face Landmarker
 * (Apache-2.0), loaded lazily, from this origin only — the model bytes go
 * through loader.ts's hash check and the wasm resolves to the version-keyed
 * same-origin directory, never the default CDN (boundaries-tested).
 *
 * Detection only, to place a crop. No recognition, no matching, no
 * liveness — this tool does not know who you are and never learns.
 */

// The package imports lazily and only in the browser; the type comes along
// statically so the calls below stay type-checked.
type Vision = typeof import("@mediapipe/tasks-vision");
type FaceLandmarker = Awaited<ReturnType<Vision["FaceLandmarker"]["createFromOptions"]>>;

let visionPromise: Promise<Vision> | null = null;
let landmarkerPromise: Promise<FaceLandmarker> | null = null;

/** Generous on purpose: the first visit downloads ~17 MB of wasm and model
 *  before the graph can even start building. */
const CREATE_TIMEOUT_MS = 60_000;

function timeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const ceiling = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, ceiling]).finally(() => clearTimeout(timer));
}

function loadVision(): Promise<Vision> {
  visionPromise ??= import("@mediapipe/tasks-vision");
  return visionPromise;
}

function loadLandmarker(onProgress?: (p: ByteProgress) => void): Promise<FaceLandmarker> {
  if (landmarkerPromise) return landmarkerPromise;
  const task = (async () => {
    const vision = await loadVision();
    const [modelBytes, fileset] = await Promise.all([
      loadFaceModel(onProgress),
      vision.FilesetResolver.forVisionTasks(WASM_BASE),
    ]);
    return vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: modelBytes, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: 1,
      // The readouts need geometry only; blendshapes and the transform
      // matrix are extra work per detection this tool has no use for.
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  })();
  landmarkerPromise = task;
  // A failed creation must not poison the memo — the next photo tries again.
  // Only a failure clears it: clearing on success too rebuilt the graph for
  // every photo and leaked each previous landmarker's wasm heap.
  task.catch(() => {
    if (landmarkerPromise === task) landmarkerPromise = null;
  });
  return task;
}

// MediaPipe landmark indices in the canonical face mesh (plan sources [7]):
// 10 sits at the top of the forehead (the mesh's crown-most point), 152 at
// the base of the chin, 468/473 are the iris centres the bundle adds on top
// of the classic 468.
const CHIN = 152;
const HAIRLINE = 10;
const IRIS_RIGHT = 468;
const IRIS_LEFT = 473;

export class DetectUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DetectUnavailableError";
  }
}

/** What detection reads: the decoded photo element or a canvas of it. */
export type DetectSource = HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas;

/**
 * Detect the first face and reduce 478 landmarks to the five numbers the
 * geometry needs. Returns null when the photo holds no face — the honest
 * outcome for a landscape or the back of a head, and the UI says so.
 */
export async function detectFace(
  source: DetectSource,
  onProgress?: (p: ByteProgress) => void,
): Promise<FaceGeometry | null> {
  if (typeof document === "undefined") throw new DetectUnavailableError("CapyPassport detects in a browser tab only");
  const landmarker = await timeout(
    loadLandmarker(onProgress),
    CREATE_TIMEOUT_MS,
    "The face model took too long to start — check your connection and try again",
  );
  const result = landmarker.detect(source);
  const landmarks = result.faceLandmarks?.[0];
  if (!landmarks || landmarks.length < HAIRLINE + 1 || landmarks.length < CHIN + 1) return null;

  let minX = 1;
  let maxX = 0;
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
  }
  // Iris centres when the bundle ships them (478 landmarks), the eye corners
  // otherwise — either way, ONE eye line.
  const eyeY =
    landmarks.length > IRIS_LEFT
      ? (landmarks[IRIS_RIGHT].y + landmarks[IRIS_LEFT].y) / 2
      : (landmarks[33].y + landmarks[133].y + landmarks[362].y + landmarks[263].y) / 4;

  return {
    chinY: landmarks[CHIN].y,
    eyeY,
    hairlineY: landmarks[HAIRLINE].y,
    centerX: (minX + maxX) / 2,
    minX,
    maxX,
  };
}

/** Release the landmarker (plan §5.6: memory hygiene on unmount). A later
 *  photo simply builds it again — from the cached, verified bytes. */
export async function disposeDetector(): Promise<void> {
  const pending = landmarkerPromise;
  landmarkerPromise = null;
  if (pending) {
    try {
      const landmarker = await pending;
      landmarker.close();
    } catch {
      /* never created — nothing to release */
    }
  }
}

/** Test hook: forget the memoized landmarker without closing it. */
export function forgetDetectorForTests(): void {
  landmarkerPromise = null;
}
