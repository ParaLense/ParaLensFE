import React, { useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  recognizeText,
  recognizeTextFromBase64,
  isAvailable,
  type OcrResult,
} from 'react-native-mlkit-ocr';

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  React.useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = () => {
    try {
      const available = isAvailable();
      setIsAvailable(available);
    } catch (error) { 
      console.error('Error checking availability:', error);
      setIsAvailable(false);
    }
  };

  const pickImage = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: true,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', 'Error picking image');
      } else if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        if (asset.uri) {
          setSelectedImage(asset.uri);
          setOcrResult(null);
        }
      }
    });
  };

  const performOcr = () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setIsLoading(true);
    try {
      const result = recognizeText(selectedImage);
      setOcrResult(result);
      
      if (!result.success) {
        Alert.alert('OCR Error', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      Alert.alert('Error', 'Failed to perform OCR');
    } finally {
      setIsLoading(false);
    }
  };

  const performOcrFromBase64 = () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setIsLoading(true);
    try {
      // For demo purposes, we'll use the image URI as base64
      // In a real app, you'd convert the image to base64 properly
      const result = recognizeTextFromBase64(selectedImage);
      setOcrResult(result);
      
      if (!result.success) {
        Alert.alert('OCR Error', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      Alert.alert('Error', 'Failed to perform OCR from base64');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MLKit OCR Demo</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>MLKit OCR Available:</Text>
          <Text style={[styles.statusValue, { color: isAvailable ? 'green' : 'red' }]}>
            {isAvailable === null ? 'Checking...' : isAvailable ? 'Yes' : 'No'}
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Pick Image</Text>
        </TouchableOpacity>

        {selectedImage && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.image} />
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.smallButton]} 
                onPress={performOcr}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>OCR from File</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.smallButton]} 
                onPress={performOcrFromBase64}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>OCR from Base64</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Processing image...</Text>
          </View>
        )}

        {ocrResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>OCR Result:</Text>
            <Text style={styles.resultText}>{ocrResult.text}</Text>
            
            {ocrResult.blocks && ocrResult.blocks.length > 0 && (
              <View style={styles.blocksContainer}>
                <Text style={styles.blocksTitle}>Text Blocks:</Text>
                {ocrResult.blocks.map((block, index) => (
                  <View key={index} style={styles.blockItem}>
                    <Text style={styles.blockText}>"{block.text}"</Text>
                    <Text style={styles.blockInfo}>
                      Bounds: ({block.boundingBox.left.toFixed(1)}, {block.boundingBox.top.toFixed(1)}) to ({block.boundingBox.right.toFixed(1)}, {block.boundingBox.bottom.toFixed(1)})
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 16,
    marginRight: 10,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallButton: {
    flex: 0.48,
    padding: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 15,
  },
  blocksContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  blocksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  blockItem: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  blockText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  blockInfo: {
    fontSize: 12,
    color: '#666',
  },
});
