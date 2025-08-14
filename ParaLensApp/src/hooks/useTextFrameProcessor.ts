import { useRef, useState, useCallback } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import { processFrame, type OcrResult } from 'react-native-mlkit-ocr';


interface FrameProcessorState {
  frameCount: number;
  faceCount: number;
  ocrText: string;
  ocrConfidence: number;
  debugStatus: string;
  ocrResults: any[];
}

interface UseFrameProcessorReturn {
  frameProcessor: any;
  frameState: FrameProcessorState;
  resetFrameCount: () => void;
}

export const useTextFrameProcessor = (): UseFrameProcessorReturn => {


  const [frameCount, setFrameCount] = useState<number>(0);
  const [faceCount, setFaceCount] = useState<number>(0);
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [debugStatus, setDebugStatus] = useState<string>('');
  const [ocrResults, setOcrResults] = useState<any[]>([]);
  
  const frameCounterRef = useRef(0);

  // Use useRunOnJS for better worklet compatibility
  const updateFrameCountJS = useRunOnJS(setFrameCount, [setFrameCount]);
  const updateFaceCountJS = useRunOnJS(setFaceCount, [setFaceCount]);
  const updateOcrTextJS = useRunOnJS(setOcrText, [setOcrText]);
  const updateOcrConfidenceJS = useRunOnJS(setOcrConfidence, [setOcrConfidence]);
  const updateOcrResultsJS = useRunOnJS(setOcrResults, [setOcrResults]);
  const updateDebugStatusJS = useRunOnJS(setDebugStatus, [setDebugStatus]);
  const consoleLogJS = useRunOnJS(console.log, [console.log]);
  const consoleErrorJS = useRunOnJS(console.error, [console.error]);

  const resetFrameCount = useCallback(() => {
    frameCounterRef.current = 0;
    setFrameCount(0);
  }, []);

    const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    try {
      // Increment frame counter using ref
      frameCounterRef.current += 1;
      const currentFrameNumber = frameCounterRef.current;
      
      // Update React state with frame count using useRunOnJS
      updateFrameCountJS(currentFrameNumber);

      // Log frame information using useRunOnJS
      consoleLogJS('Frame processed:', frame.width, 'x', frame.height, 'Frame #:', currentFrameNumber);
      
      // Simple frame analysis without external dependencies
      const frameSize = frame.width * frame.height;
      const aspectRatio = frame.width / frame.height;
      
      consoleLogJS('Frame analysis:', {
        size: frameSize,
        aspectRatio: aspectRatio.toFixed(2),
        timestamp: frame.timestamp,
      });


      // REAL OCR using your local library!
      try {

        // Process frame with your ML Kit OCR library
         const ocrResult: OcrResult = processFrame(frame);

         if (ocrResult.success && ocrResult.text) {
           // Extract text and confidence from the result
           const detectedText = ocrResult.text;
           const textBlocks = ocrResult.blocks || [];

           // Update state with real OCR results
           updateOcrTextJS(detectedText);
           updateOcrConfidenceJS(0.8); // Default confidence since it's not in OcrResult
           updateOcrResultsJS(textBlocks);
           updateDebugStatusJS(`Text: "${detectedText}" (80.0%)`);

           consoleLogJS('Real OCR Text detected:', detectedText);
           consoleLogJS('Text blocks:', textBlocks);
         } else {
           // No text detected
           updateOcrTextJS('');
           updateOcrConfidenceJS(0);
           updateOcrResultsJS([]);
           updateDebugStatusJS('No text detected');

           if (ocrResult.error) {
             consoleLogJS('OCR Error:', ocrResult.error);
           }
         }
      } catch (ocrError) {
        consoleErrorJS('OCR processing error:', ocrError);
        updateDebugStatusJS('OCR processing failed');
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      consoleErrorJS('Frame processor error:', error);
      updateDebugStatusJS(`Error: ${errorMessage}`);
    }
  }, [updateFrameCountJS, updateFaceCountJS, updateOcrTextJS, updateOcrConfidenceJS, updateOcrResultsJS, updateDebugStatusJS, consoleLogJS, consoleErrorJS]);

  return {
    frameProcessor,
    frameState: {
      frameCount,
      faceCount,
      ocrText,
      ocrConfidence,
      debugStatus,
      ocrResults,
    },
    resetFrameCount,
  };
};



