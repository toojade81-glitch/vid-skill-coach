// Utility functions for comparing keypoint sequences between user and reference videos

export interface KeypointFrame {
  keypoints: number[][];
  timestamp: number;
  confidence: number;
}

export interface ComparisonResult {
  overallSimilarity: number;
  phaseScores: {
    preparation: number;
    execution: number;
    followThrough: number;
  };
  keyPointDeviations: {
    point: string;
    deviation: number;
  }[];
  timingScore: number;
}

// Calculate distance between two keypoints
const calculateDistance = (point1: number[], point2: number[]): number => {
  const dx = point1[0] - point2[0];
  const dy = point1[1] - point2[1];
  return Math.sqrt(dx * dx + dy * dy);
};

// Normalize keypoints relative to body center
const normalizeKeypoints = (keypoints: number[][]): number[][] => {
  if (keypoints.length < 17) return keypoints;
  
  // Use hip center as reference (average of left and right hip)
  const leftHip = keypoints[11];
  const rightHip = keypoints[12];
  const centerX = (leftHip[0] + rightHip[0]) / 2;
  const centerY = (leftHip[1] + rightHip[1]) / 2;
  
  return keypoints.map(point => [
    point[0] - centerX,
    point[1] - centerY,
    point[2] // Keep confidence score
  ]);
};

// Calculate similarity between two normalized keypoint sets
const calculatePoseSimilarity = (userKeypoints: number[][], refKeypoints: number[][]): number => {
  if (userKeypoints.length !== refKeypoints.length) return 0;
  
  let totalSimilarity = 0;
  let validPoints = 0;
  
  for (let i = 0; i < userKeypoints.length; i++) {
    const userPoint = userKeypoints[i];
    const refPoint = refKeypoints[i];
    
    // Only compare points with sufficient confidence (lowered threshold)
    if (userPoint[2] > 0.2 && refPoint[2] > 0.2) {
      const distance = calculateDistance(userPoint, refPoint);
      // Convert distance to similarity score with more forgiving normalization
      const similarity = Math.max(0, 1 - distance / 0.5); // Much more forgiving threshold
      totalSimilarity += similarity;
      validPoints++;
    }
  }
  
  return validPoints > 0 ? totalSimilarity / validPoints : 0;
};

// Analyze movement phases based on keypoint velocity
const analyzeMovementPhases = (frames: KeypointFrame[]): {
  preparation: KeypointFrame[];
  execution: KeypointFrame[];
  followThrough: KeypointFrame[];
} => {
  if (frames.length < 3) {
    return {
      preparation: frames,
      execution: [],
      followThrough: []
    };
  }
  
  // Calculate movement velocity for each frame
  const velocities = frames.map((frame, index) => {
    if (index === 0) return 0;
    
    const prevFrame = frames[index - 1];
    let totalMovement = 0;
    let validPoints = 0;
    
    for (let i = 0; i < frame.keypoints.length; i++) {
      if (frame.keypoints[i][2] > 0.2 && prevFrame.keypoints[i][2] > 0.2) {
        const movement = calculateDistance(frame.keypoints[i], prevFrame.keypoints[i]);
        totalMovement += movement;
        validPoints++;
      }
    }
    
    return validPoints > 0 ? totalMovement / validPoints : 0;
  });
  
  // Find peak movement (execution phase)
  const maxVelocityIndex = velocities.indexOf(Math.max(...velocities));
  const executionStart = Math.max(0, maxVelocityIndex - 2);
  const executionEnd = Math.min(frames.length - 1, maxVelocityIndex + 2);
  
  return {
    preparation: frames.slice(0, executionStart),
    execution: frames.slice(executionStart, executionEnd + 1),
    followThrough: frames.slice(executionEnd + 1)
  };
};

// Main comparison function
export const compareKeypointSequences = (
  userFrames: KeypointFrame[],
  referenceFrames: KeypointFrame[]
): ComparisonResult => {
  // Normalize both sequences
  const normalizedUserFrames = userFrames.map(frame => ({
    ...frame,
    keypoints: normalizeKeypoints(frame.keypoints)
  }));
  
  const normalizedRefFrames = referenceFrames.map(frame => ({
    ...frame,
    keypoints: normalizeKeypoints(frame.keypoints)
  }));
  
  // Analyze movement phases for both sequences
  const userPhases = analyzeMovementPhases(normalizedUserFrames);
  const refPhases = analyzeMovementPhases(normalizedRefFrames);
  
  // Calculate phase similarities
  const phaseScores = {
    preparation: calculatePhasesimilarity(userPhases.preparation, refPhases.preparation),
    execution: calculatePhasesimilarity(userPhases.execution, refPhases.execution),
    followThrough: calculatePhasesimilarity(userPhases.followThrough, refPhases.followThrough)
  };
  
  // Calculate overall similarity (weighted average)
  const overallSimilarity = (
    phaseScores.preparation * 0.2 +
    phaseScores.execution * 0.6 +
    phaseScores.followThrough * 0.2
  );
  
  // Calculate timing score based on sequence length similarity
  const timingScore = calculateTimingScore(normalizedUserFrames, normalizedRefFrames);
  
  // Identify key point deviations
  const keyPointDeviations = calculateKeyPointDeviations(
    normalizedUserFrames,
    normalizedRefFrames
  );
  
  return {
    overallSimilarity,
    phaseScores,
    keyPointDeviations,
    timingScore
  };
};

// Helper function to calculate similarity between movement phases
const calculatePhasesimilarity = (userPhase: KeypointFrame[], refPhase: KeypointFrame[]): number => {
  if (userPhase.length === 0 || refPhase.length === 0) return 0.5;
  
  let totalSimilarity = 0;
  const comparisons = Math.min(userPhase.length, refPhase.length);
  
  for (let i = 0; i < comparisons; i++) {
    const userIndex = Math.floor((i / comparisons) * userPhase.length);
    const refIndex = Math.floor((i / comparisons) * refPhase.length);
    
    const similarity = calculatePoseSimilarity(
      userPhase[userIndex].keypoints,
      refPhase[refIndex].keypoints
    );
    totalSimilarity += similarity;
  }
  
  return totalSimilarity / comparisons;
};

// Calculate timing score based on sequence duration similarity
const calculateTimingScore = (userFrames: KeypointFrame[], refFrames: KeypointFrame[]): number => {
  const userDuration = userFrames.length;
  const refDuration = refFrames.length;
  
  const ratio = Math.min(userDuration, refDuration) / Math.max(userDuration, refDuration);
  return ratio;
};

// Identify specific keypoint deviations
const calculateKeyPointDeviations = (
  userFrames: KeypointFrame[],
  refFrames: KeypointFrame[]
): { point: string; deviation: number }[] => {
  const keypointNames = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle"
  ];
  
  const deviations: { point: string; deviation: number }[] = [];
  
  for (let pointIndex = 0; pointIndex < keypointNames.length; pointIndex++) {
    let totalDeviation = 0;
    let validComparisons = 0;
    
    const comparisons = Math.min(userFrames.length, refFrames.length);
    
    for (let frameIndex = 0; frameIndex < comparisons; frameIndex++) {
      const userPoint = userFrames[frameIndex].keypoints[pointIndex];
      const refPoint = refFrames[frameIndex].keypoints[pointIndex];
      
      if (userPoint[2] > 0.2 && refPoint[2] > 0.2) {
        const deviation = calculateDistance(userPoint, refPoint);
        totalDeviation += deviation;
        validComparisons++;
      }
    }
    
    if (validComparisons > 0) {
      deviations.push({
        point: keypointNames[pointIndex],
        deviation: totalDeviation / validComparisons
      });
    }
  }
  
  // Sort by deviation (highest first)
  return deviations.sort((a, b) => b.deviation - a.deviation).slice(0, 5);
};