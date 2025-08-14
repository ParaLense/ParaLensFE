import Foundation
import MLKitTextRecognition
import MLKitVision
import UIKit

class MlkitOcr: HybridMlkitOcrSpec {
    private let textRecognizer = TextRecognizer.textRecognizer()

    public func multiply(a: Double, b: Double) throws -> Double {
        return a * b
    }

    // MARK: - Static Image OCR Methods

    public func recognizeText(imagePath: String) throws -> OcrResult {
        let semaphore = DispatchSemaphore(value: 0)
        var ocrResult: OcrResult?
        var processingError: Error?

        Task {
            do {
                guard let image = UIImage(contentsOfFile: imagePath) else {
                    ocrResult = OcrResult(
                        text: "",
                        blocks: [],
                        success: false,
                        error: "Failed to load image from path: \(imagePath)"
                    )
                    semaphore.signal()
                    return
                }

                let visionImage = VisionImage(image: image)
                let result = try await textRecognizer.process(visionImage)

                ocrResult = processTextRecognitionResult(result)
            } catch {
                processingError = error
            }
            semaphore.signal()
        }

        semaphore.wait()

        if let error = processingError {
            throw error
        }

        return ocrResult ?? OcrResult(
            text: "",
            blocks: [],
            success: false,
            error: "Failed to process image"
        )
    }

    public func recognizeTextFromBase64(base64Image: String) throws -> OcrResult {
        let semaphore = DispatchSemaphore(value: 0)
        var ocrResult: OcrResult?
        var processingError: Error?

        Task {
            do {
                guard let imageData = Data(base64Encoded: base64Image),
                      let image = UIImage(data: imageData) else {
                    ocrResult = OcrResult(
                        text: "",
                        blocks: [],
                        success: false,
                        error: "Failed to decode base64 image"
                    )
                    semaphore.signal()
                    return
                }

                let visionImage = VisionImage(image: image)
                let result = try await textRecognizer.process(visionImage)

                ocrResult = processTextRecognitionResult(result)
            } catch {
                processingError = error
            }
            semaphore.signal()
        }

        semaphore.wait()

        if let error = processingError {
            throw error
        }

        return ocrResult ?? OcrResult(
            text: "",
            blocks: [],
            success: false,
            error: "Failed to process base64 image"
        )
    }

    // MARK: - Vision Camera Frame Processing Methods

    public func processFrame(frame: Frame) throws -> OcrResult {
        let semaphore = DispatchSemaphore(value: 0)
        var ocrResult: OcrResult?
        var processingError: Error?

        Task {
            do {
                // Convert frame data to UIImage
                let image = try convertFrameToUIImage(frame)
                let visionImage = VisionImage(image: image)
                let result = try await textRecognizer.process(visionImage)

                ocrResult = processTextRecognitionResult(result)
            } catch {
                processingError = error
            }
            semaphore.signal()
        }

        semaphore.wait()

        if let error = processingError {
            throw error
        }

        return ocrResult ?? OcrResult(
            text: "",
            blocks: [],
            success: false,
            error: "Failed to process frame"
        )
    }

    public func processFrameSync(frame: Frame) throws -> OcrResult {
        return try processFrame(frame)
    }

    // MARK: - Utility Methods

    public func isAvailable() throws -> Bool {
        return true
    }

    // MARK: - Private Helper Methods

    private func convertFrameToUIImage(_ frame: Frame) throws -> UIImage {
        // Get the frame data as ArrayBuffer
        let arrayBuffer = frame.toArrayBuffer()
        
        // Convert ArrayBuffer to Data
        let data = Data(bytes: arrayBuffer, count: arrayBuffer.count)
        
        // Create UIImage from data
        guard let image = UIImage(data: data) else {
            throw NSError(domain: "MlkitOcr", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to create UIImage from frame data"])
        }
        
        return image
    }

    private func processTextRecognitionResult(_ result: Text) -> OcrResult {
        var allText = ""
        var blocks: [TextBlock] = []

        for block in result.blocks {
            let blockText = block.text
            allText += blockText + "\n"

            let textBlock = TextBlock(
                text: blockText,
                boundingBox: BoundingBox(
                    left: block.frame.origin.x,
                    top: block.frame.origin.y,
                    right: block.frame.origin.x + block.frame.size.width,
                    bottom: block.frame.origin.y + block.frame.size.height
                ),
                cornerPoints: [
                    CornerPoint(x: block.frame.origin.x, y: block.frame.origin.y),
                    CornerPoint(x: block.frame.origin.x + block.frame.size.width, y: block.frame.origin.y),
                    CornerPoint(x: block.frame.origin.x + block.frame.size.width, y: block.frame.origin.y + block.frame.size.height),
                    CornerPoint(x: block.frame.origin.x, y: block.frame.origin.y + block.frame.size.height)
                ]
            )
            blocks.append(textBlock)
        }

        return OcrResult(
            text: allText.trimmingCharacters(in: .whitespacesAndNewlines),
            blocks: blocks,
            success: true
        )
    }
}
