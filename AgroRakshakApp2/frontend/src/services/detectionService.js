import { ref, push, set, query, orderByChild, limitToLast, get } from 'firebase/database';
import { database } from '../config/firebase';

// Save detection to Realtime Database ONLY (no Storage/images)
export const saveDetection = async (userId, detectionData) => {
  try {
    const timestamp = Date.now();
    
    console.log('Saving detection for user:', userId);
    
    const detectionsRef = ref(database, `detections/${userId}`);
    const newDetectionRef = push(detectionsRef);
    
    const detectionRecord = {
      class: detectionData.class,
      confidence: detectionData.confidence,
      severity: detectionData.severity,
      recommendation: detectionData.recommendation,
      timestamp,
      date: new Date().toISOString(),
    };

    await set(newDetectionRef, detectionRecord);
    
    console.log('✅ Detection saved successfully!', newDetectionRef.key);
    return { success: true, id: newDetectionRef.key };
  } catch (error) {
    console.error('❌ Error saving detection:', error);
    throw error;
  }
};

// Get user's detection history
export const getDetectionHistory = async (userId, limit = 10) => {
  try {
    const detectionsRef = ref(database, `detections/${userId}`);
    const historyQuery = query(
      detectionsRef,
      orderByChild('timestamp'),
      limitToLast(limit)
    );

    const snapshot = await get(historyQuery);
    
    if (snapshot.exists()) {
      const detections = [];
      snapshot.forEach((childSnapshot) => {
        detections.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      
      return detections.reverse();
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching detection history:', error);
    throw error;
  }
};
