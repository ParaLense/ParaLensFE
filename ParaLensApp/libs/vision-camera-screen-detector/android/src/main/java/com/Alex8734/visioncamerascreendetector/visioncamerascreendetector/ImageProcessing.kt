package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import android.graphics.Bitmap
import android.media.Image
import android.util.Base64
import android.util.Log
import org.opencv.core.*
import org.opencv.imgproc.Imgproc
import org.opencv.calib3d.Calib3d
import org.opencv.android.Utils
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.util.HashMap
import java.util.ArrayList
import kotlin.math.max
import kotlin.math.min

/**
 * Handles all OpenCV image processing operations
 */
object ImageProcessing {
    
    /**
     * Convert Y plane of Image to grayscale Mat
     */
    fun yPlaneToGrayMat(image: Image): Mat {
        val yPlane = image.planes[0]
        val yBuffer: ByteBuffer = yPlane.buffer
        val yRowStride = yPlane.rowStride
        val yPixelStride = yPlane.pixelStride
        val width = image.width
        val height = image.height
        val gray = Mat(height, width, CvType.CV_8UC1)
        val rowBytes = ByteArray(yRowStride)
        var row = 0
        yBuffer.rewind()
        while (row < height) {
            val pos = row * yRowStride
            if (yBuffer.position() != pos) yBuffer.position(pos)
            val length = min(yRowStride, yBuffer.remaining())
            yBuffer.get(rowBytes, 0, length)
            if (yPixelStride == 1) {
                gray.put(row, 0, rowBytes, 0, width)
            } else {
                val tmp = ByteArray(width)
                var idx = 0; var col = 0
                while (col < width && (col * yPixelStride) < length) {
                    tmp[idx++] = rowBytes[col * yPixelStride]
                    col++
                }
                gray.put(row, 0, tmp)
            }
            row++
        }
        return gray
    }
    
    /**
     * Apply preprocessing for better light handling
     */
    fun preprocessImage(img: Mat): Mat {
        val normalized = Mat()
        val clahe = Imgproc.createCLAHE(2.0, Size(8.0, 8.0))
        clahe.apply(img, normalized)
        return normalized
    }
    
    /**
     * Create edge detection maps for screen and detail detection
     */
    fun createEdgeMaps(normalized: Mat): Pair<Mat, Mat> {
        val screenBlur = Mat()
        val detailBlur = Mat()
        
        // For screen detection: stronger blur, adaptive thresholds
        Imgproc.GaussianBlur(normalized, screenBlur, Size(5.0, 5.0), 1.5)
        val mean = Core.mean(screenBlur)
        val sigma = 0.33
        val v = mean.`val`[0]
        val lowerScreen = Math.max(0.0, (1.0 - sigma) * v)
        val upperScreen = Math.min(255.0, (1.0 + sigma) * v)
        
        // For detail/template detection: minimal blur, lower thresholds
        Imgproc.GaussianBlur(normalized, detailBlur, Size(3.0, 3.0), 1.0)
        
        val screenEdges = Mat()
        val detailEdges = Mat()
        
        // Screen edges: for finding the display outline
        Imgproc.Canny(screenBlur, screenEdges, lowerScreen, upperScreen, 3, false)
        
        // Detail edges: for finding template boxes with dynamic thresholds
        val detailMean = Core.mean(detailBlur)
        val detailV = detailMean.`val`[0]
        val detailLower = Math.max(20.0, detailV * 0.3)
        val detailUpper = Math.min(200.0, detailV * 0.9)
        Imgproc.Canny(detailBlur, detailEdges, detailLower, detailUpper, 3, false)
        
        // Optional: Light morphological closing on screen edges to connect gaps
        val kernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(3.0, 3.0))
        Imgproc.morphologyEx(screenEdges, screenEdges, Imgproc.MORPH_CLOSE, kernel)
        
        return Pair(screenEdges, detailEdges)
    }
    
    /**
     * Find contours and convert to rectangles
     */
    fun findContourRects(edges: Mat): List<IntArray> {
        val contours = ArrayList<MatOfPoint>()
        val hierarchy = Mat()
        Imgproc.findContours(edges, contours, hierarchy, Imgproc.RETR_EXTERNAL, Imgproc.CHAIN_APPROX_SIMPLE)
        
        val contourRects = ArrayList<IntArray>()
        val approx = MatOfPoint2f()
        val tmp2f = MatOfPoint2f()
        
        for (cnt in contours) {
            tmp2f.fromArray(*cnt.toArray())
            val perim = Imgproc.arcLength(tmp2f, true)
            Imgproc.approxPolyDP(tmp2f, approx, 0.02 * perim, true)
            if (approx.total().toInt() != 4) continue
            
            val pts = approx.toArray()
            var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
            var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
            for (p in pts) { 
                if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y
                if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y 
            }
            val x = max(0, minX.toInt()); val y = max(0, minY.toInt())
            val wpx = min(edges.width() - x, (maxX - minX).toInt())
            val hpx = min(edges.height() - y, (maxY - minY).toInt())
            if (wpx <= 0 || hpx <= 0) continue
            contourRects.add(intArrayOf(x, y, wpx, hpx))
        }
        
        return contourRects
    }

    /**
     * Draw rectangles on image for debug visualization
     */
    fun drawDebugRects(image: Mat, rects: List<IntArray>, color: Scalar, thickness: Int = 2): Mat {
        // Convert grayscale to BGR for color visualization
        val debugImage = Mat()
        Imgproc.cvtColor(image, debugImage, Imgproc.COLOR_GRAY2BGR)
        
        for (rect in rects) {
            val x = rect[0]
            val y = rect[1]
            val w = rect[2]
            val h = rect[3]
            Imgproc.rectangle(debugImage, Point(x.toDouble(), y.toDouble()), 
                            Point((x + w).toDouble(), (y + h).toDouble()), color, thickness)
        }
        
        return debugImage
    }

    /**
     * Draw template boxes on image for debug visualization
     */
    fun drawDebugTemplateBoxes(image: Mat, templateBoxes: List<Box>, H: Mat?, 
                              templateTargetW: Int, templateTargetH: Int, 
                              color: Scalar, thickness: Int = 2): Mat {
        // Convert grayscale to BGR for color visualization
        val debugImage = Mat()
        Imgproc.cvtColor(image, debugImage, Imgproc.COLOR_GRAY2BGR)
        
        if (H == null) return debugImage
        
        for (box in templateBoxes) {
            val pts = MatOfPoint2f(*percentBoxToPts(box, templateTargetW, templateTargetH))
            val proj = MatOfPoint2f()
            Core.perspectiveTransform(pts, proj, H)
            val arr = proj.toArray()
            
            var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
            var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
            for (p in arr) { 
                if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y
                if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y 
            }
            
            val x = max(0, minX.toInt())
            val y = max(0, minY.toInt())
            val w = min(debugImage.width() - x, (maxX - minX).toInt())
            val h = min(debugImage.height() - y, (maxY - minY).toInt())
            
            if (w > 0 && h > 0) {
                Imgproc.rectangle(debugImage, Point(x.toDouble(), y.toDouble()), 
                                Point((x + w).toDouble(), (y + h).toDouble()), color, thickness)
            }
        }
        
        return debugImage
    }

    /**
     * Draw OCR template boxes on image for debug visualization
     * @param cameraFeedImage The camera feed image (grayscale) to draw on
     * @param ocrBoxes OCR boxes with coordinates in warped space (percentage)
     * @param outputW Width of warped image
     * @param outputH Height of warped image
     * @param H Homography matrix from canonical (warped) to camera feed (H: canonical -> image)
     */
    fun drawOcrTemplateBoxesOnCameraFeed(cameraFeedImage: Mat, ocrBoxes: List<OcrBox>, 
                                         outputW: Int, outputH: Int, H: Mat?): Mat {
        // Convert grayscale to BGR for color visualization
        val debugImage = Mat()
        Imgproc.cvtColor(cameraFeedImage, debugImage, Imgproc.COLOR_GRAY2BGR)
        
        if (H == null || H.empty()) return debugImage
        
        for (box in ocrBoxes) {
            // Box coordinates in warped/canonical space (as percentage)
            val warpedX = (box.x / 100.0) * outputW
            val warpedY = (box.y / 100.0) * outputH
            val warpedW = (box.w / 100.0) * outputW
            val warpedH = (box.h / 100.0) * outputH
            
            // Create points in canonical/warped space
            val canonicalPts = MatOfPoint2f(
                Point(warpedX, warpedY),
                Point(warpedX + warpedW, warpedY),
                Point(warpedX + warpedW, warpedY + warpedH),
                Point(warpedX, warpedY + warpedH)
            )
            
            // Project to camera feed using H (canonical -> image)
            val cameraPts = MatOfPoint2f()
            Core.perspectiveTransform(canonicalPts, cameraPts, H)
            val arr = cameraPts.toArray()
            
            var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
            var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
            for (p in arr) {
                if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y
                if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y
            }
            
            val rx = max(0, minX.toInt())
            val ry = max(0, minY.toInt())
            val rw = min(debugImage.width() - rx, (maxX - minX).toInt())
            val rh = min(debugImage.height() - ry, (maxY - minY).toInt())
            
            if (rw > 0 && rh > 0) {
                // Choose color based on box type
                val color = when (box.type) {
                    "checkbox" -> Scalar(0.0, 255.0, 0.0)  // Green for checkboxes
                    "scrollbar" -> Scalar(255.0, 0.0, 255.0)  // Magenta for scrollbars
                    else -> Scalar(0.0, 255.0, 255.0)  // Yellow for value boxes
                }
                
                // Draw rectangle as polygon to handle perspective
                val poly = MatOfPoint(
                    Point(arr[0].x, arr[0].y),
                    Point(arr[1].x, arr[1].y),
                    Point(arr[2].x, arr[2].y),
                    Point(arr[3].x, arr[3].y)
                )
                Imgproc.polylines(debugImage, listOf(poly), true, color, 2)
                
                // Draw box ID as text at top-left corner
                val textX = arr[0].x
                val textY = arr[0].y - 5
                if (textY > 10) {
                    Imgproc.putText(debugImage, box.id, Point(textX, textY), 
                                  Imgproc.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
                }
            }
        }
        
        return debugImage
    }

    /**
     * Draw OCR template boxes on warped image for debug visualization (legacy method)
     */
    fun drawOcrTemplateBoxes(image: Mat, ocrBoxes: List<OcrBox>, outputW: Int, outputH: Int): Mat {
        // Convert grayscale to BGR for color visualization
        val debugImage = Mat()
        Imgproc.cvtColor(image, debugImage, Imgproc.COLOR_GRAY2BGR)
        
        for (box in ocrBoxes) {
            val rx = ((box.x / 100.0) * outputW).toInt().coerceIn(0, outputW - 1)
            val ry = ((box.y / 100.0) * outputH).toInt().coerceIn(0, outputH - 1)
            val rw = max(1, ((box.w / 100.0) * outputW).toInt())
            val rh = max(1, ((box.h / 100.0) * outputH).toInt())
            val x2 = (rx + rw).coerceAtMost(outputW)
            val y2 = (ry + rh).coerceAtMost(outputH)
            
            // Choose color based on box type
            val color = when (box.type) {
                "checkbox" -> Scalar(0.0, 255.0, 0.0)  // Green for checkboxes
                "scrollbar" -> Scalar(255.0, 0.0, 255.0)  // Magenta for scrollbars
                else -> Scalar(0.0, 255.0, 255.0)  // Yellow for value boxes
            }
            
            // Draw rectangle
            Imgproc.rectangle(debugImage, Point(rx.toDouble(), ry.toDouble()), 
                            Point(x2.toDouble(), y2.toDouble()), color, 2)
            
            // Draw box ID as text
            val textY = ry - 5
            if (textY > 10) {
                Imgproc.putText(debugImage, box.id, Point(rx.toDouble(), textY.toDouble()), 
                              Imgproc.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
            }
        }
        
        return debugImage
    }
    
    /**
     * Draw matched boxes from warped space on camera feed
     * @param cameraFeedImage The camera feed image (grayscale) to draw on
     * @param matchedArr Matched boxes with coordinates in warped space (x, y, w, h)
     * @param templateBoxes Template boxes for getting canonical coordinates
     * @param outputW Width of warped image
     * @param outputH Height of warped image
     * @param H Homography matrix from canonical (warped) to camera feed (H: canonical -> image)
     */
    fun drawMatchedBoxesOnCameraFeed(cameraFeedImage: Mat, matchedArr: List<Any?>, 
                                     templateBoxes: List<Box>?, outputW: Int, outputH: Int, 
                                     H: Mat?): Mat {
        // Convert grayscale to BGR for color visualization
        val debugImage = Mat()
        Imgproc.cvtColor(cameraFeedImage, debugImage, Imgproc.COLOR_GRAY2BGR)
        
        if (H == null || H.empty() || templateBoxes == null) return debugImage
        
        // Draw matched boxes (green for detected, yellow for template)
        for (i in matchedArr.indices) {
            val m = matchedArr[i]
            val box = templateBoxes.getOrNull(i) ?: continue
            
            if (m is HashMap<*, *>) {
                // This box was matched - draw in green
                val warpedX = (m["x"] as? Number)?.toDouble() ?: continue
                val warpedY = (m["y"] as? Number)?.toDouble() ?: continue
                val warpedW = (m["w"] as? Number)?.toDouble() ?: continue
                val warpedH = (m["h"] as? Number)?.toDouble() ?: continue
                
                // Create points in canonical/warped space
                val canonicalPts = MatOfPoint2f(
                    Point(warpedX, warpedY),
                    Point(warpedX + warpedW, warpedY),
                    Point(warpedX + warpedW, warpedY + warpedH),
                    Point(warpedX, warpedY + warpedH)
                )
                
                // Project to camera feed using H (canonical -> image)
                val cameraPts = MatOfPoint2f()
                Core.perspectiveTransform(canonicalPts, cameraPts, H)
                val arr = cameraPts.toArray()
                
                // Draw as polygon to handle perspective
                val poly = MatOfPoint(
                    Point(arr[0].x, arr[0].y),
                    Point(arr[1].x, arr[1].y),
                    Point(arr[2].x, arr[2].y),
                    Point(arr[3].x, arr[3].y)
                )
                Imgproc.polylines(debugImage, listOf(poly), true, Scalar(0.0, 255.0, 0.0), 3)
                
                // Draw box ID and score with background for readability
                val boxId = (m["boxId"] as? String) ?: box.id
                val score = (m["score"] as? Number)?.toDouble()

                val baseX = arr[0].x
                val baseY = arr[0].y
                var textX = Math.max(2.0, baseX)
                var textY = Math.max(14.0, baseY - 6.0)

                val label = if (score != null) "$boxId  ${String.format("%.2f", score)}" else boxId
                val textSize = Imgproc.getTextSize(label, Imgproc.FONT_HERSHEY_SIMPLEX, 0.6, 2, null)
                val bgW = textSize.width + 10
                val bgH = textSize.height + 8

                // Clamp background within image bounds
                val bgX1 = Math.max(0.0, textX - 4)
                val bgY1 = Math.max(0.0, textY - textSize.height - 6)
                val bgX2 = Math.min(debugImage.width().toDouble() - 1, bgX1 + bgW)
                val bgY2 = Math.min(debugImage.height().toDouble() - 1, bgY1 + bgH)

                // Background rectangle (solid dark)
                Imgproc.rectangle(
                    debugImage,
                    Point(bgX1, bgY1),
                    Point(bgX2, bgY2),
                    Scalar(10.0, 10.0, 10.0),
                    Imgproc.FILLED
                )

                // Draw text with thicker stroke for contrast
                Imgproc.putText(
                    debugImage,
                    label,
                    Point(textX, bgY2 - 6),
                    Imgproc.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    Scalar(255.0, 255.0, 255.0),
                    2
                )
            } else {
                // This box was not matched - draw template in yellow (dashed)
                val canonicalPts = MatOfPoint2f(*percentBoxToPts(box, outputW, outputH))
                val cameraPts = MatOfPoint2f()
                Core.perspectiveTransform(canonicalPts, cameraPts, H)
                val arr = cameraPts.toArray()
                
                // Draw as dashed polygon (by drawing lines)
                val poly = MatOfPoint(
                    Point(arr[0].x, arr[0].y),
                    Point(arr[1].x, arr[1].y),
                    Point(arr[2].x, arr[2].y),
                    Point(arr[3].x, arr[3].y)
                )
                Imgproc.polylines(debugImage, listOf(poly), true, Scalar(0.0, 255.0, 255.0), 1)
            }
        }
        
        return debugImage
    }

    /**
     * Create combined debug visualization with Canny edges and detected rectangles
     */
    fun createCombinedDebugVisualization(originalImage: Mat, screenEdges: Mat, detailEdges: Mat, 
                                        screenRects: List<IntArray>, detailRects: List<IntArray>,
                                        templateBoxes: List<Box>?, H: Mat?, templateTargetW: Int, templateTargetH: Int): Mat {
        // Convert grayscale to BGR for color visualization
        val colorImage = Mat()
        Imgproc.cvtColor(originalImage, colorImage, Imgproc.COLOR_GRAY2BGR)
        
        // Overlay screen edges in green
        val screenEdgesColor = Mat()
        Imgproc.cvtColor(screenEdges, screenEdgesColor, Imgproc.COLOR_GRAY2BGR)
        Core.addWeighted(colorImage, 0.7, screenEdgesColor, 0.3, 0.0, colorImage)
        
        // Overlay detail edges in blue
        val detailEdgesColor = Mat()
        Imgproc.cvtColor(detailEdges, detailEdgesColor, Imgproc.COLOR_GRAY2BGR)
        Core.addWeighted(colorImage, 0.7, detailEdgesColor, 0.2, 0.0, colorImage)
        
        // Draw screen contour rectangles in bright green
        for (rect in screenRects) {
            val x = rect[0]; val y = rect[1]; val w = rect[2]; val h = rect[3]
            Imgproc.rectangle(colorImage, Point(x.toDouble(), y.toDouble()), 
                            Point((x + w).toDouble(), (y + h).toDouble()), Scalar(0.0, 255.0, 0.0), 3)
        }
        
        // Draw detail contour rectangles in red
        for (rect in detailRects) {
            val x = rect[0]; val y = rect[1]; val w = rect[2]; val h = rect[3]
            Imgproc.rectangle(colorImage, Point(x.toDouble(), y.toDouble()), 
                            Point((x + w).toDouble(), (y + h).toDouble()), Scalar(0.0, 0.0, 255.0), 2)
        }
        
        // Draw template boxes in yellow if homography is available
        if (H != null && templateBoxes != null) {
            for (box in templateBoxes) {
                val pts = MatOfPoint2f(*percentBoxToPts(box, templateTargetW, templateTargetH))
                val proj = MatOfPoint2f()
                Core.perspectiveTransform(pts, proj, H)
                val arr = proj.toArray()
                
                var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
                var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
                for (p in arr) { 
                    if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y
                    if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y 
                }
                
                val x = max(0, minX.toInt())
                val y = max(0, minY.toInt())
                val w = min(colorImage.width() - x, (maxX - minX).toInt())
                val h = min(colorImage.height() - y, (maxY - minY).toInt())
                
                if (w > 0 && h > 0) {
                    Imgproc.rectangle(colorImage, Point(x.toDouble(), y.toDouble()), 
                                    Point((x + w).toDouble(), (y + h).toDouble()), Scalar(0.0, 255.0, 255.0), 2)
                }
            }
        }
        
        return colorImage
    }
    
    /**
     * Order quadrilateral points to match canonical template orientation
     */
    fun orderQuad(pts: Array<Point>): Array<Point> {
        // Find centroid
        val cx = pts.map { it.x }.average()
        val cy = pts.map { it.y }.average()
        
        // Separate into left/right based on x-coordinate
        val (left, right) = pts.partition { it.x < cx }
        
        // Sort left points by y (top to bottom)
        val leftSorted = left.sortedBy { it.y }
        val tl = if (leftSorted.isNotEmpty()) leftSorted[0] else pts[0]
        val bl = if (leftSorted.size > 1) leftSorted[1] else pts[3]
        
        // Sort right points by y (top to bottom)
        val rightSorted = right.sortedBy { it.y }
        val tr = if (rightSorted.isNotEmpty()) rightSorted[0] else pts[1]
        val br = if (rightSorted.size > 1) rightSorted[1] else pts[2]
        
        return arrayOf(tl, tr, br, bl)
    }
    
    /**
     * Convert rectangle to points
     */
    fun rectToPtsXYWH(r: IntArray): Array<Point> {
        val x = r[0].toDouble(); val y = r[1].toDouble(); val w = r[2].toDouble(); val h = r[3].toDouble()
        return arrayOf(
            Point(x, y),
            Point(x + w, y),
            Point(x + w, y + h),
            Point(x, y + h)
        )
    }
    
    /**
     * Convert percentage box to points
     */
    fun percentBoxToPts(box: Box, templateW: Int, templateH: Int): Array<Point> {
        val x = box.x / 100.0 * templateW
        val y = box.y / 100.0 * templateH
        val w = box.w / 100.0 * templateW
        val h = box.h / 100.0 * templateH
        return arrayOf(
            Point(x, y),
            Point(x + w, y),
            Point(x + w, y + h),
            Point(x, y + h)
        )
    }
    
    /**
     * Build homography matrix from template boxes and matches
     */
    fun buildHomography(templateBoxes: List<Box>, matches: Array<IntArray?>, templateW: Int, templateH: Int): Pair<Mat?, Mat?> {
        val dstPtsList = ArrayList<Point>() // canonical template points (destination)
        val srcPtsList = ArrayList<Point>() // observed points from the frame (source)
        for (i in templateBoxes.indices) {
            val observed = matches[i] ?: continue
            percentBoxToPts(templateBoxes[i], templateW, templateH).forEach { dstPtsList.add(it) }
            rectToPtsXYWH(observed).forEach { srcPtsList.add(it) }
        }
        if (srcPtsList.size < 4 || dstPtsList.size < 4) return Pair(null, null)
        val src = MatOfPoint2f().apply { fromList(srcPtsList) }
        val dst = MatOfPoint2f().apply { fromList(dstPtsList) }
        val mask = Mat()
        val H = Calib3d.findHomography(src, dst, Calib3d.RANSAC, 3.0, mask)
        return Pair(H, mask)
    }
    
    /**
     * Warp and encode image to base64
     */
    fun warpAndEncodeGrayToBase64(gray: Mat, H: Mat, outW: Int, outH: Int, jpegQuality: Int): String? {
        return try {
            val warped = Mat(outH, outW, CvType.CV_8UC1)
            Imgproc.warpPerspective(gray, warped, H, Size(outW.toDouble(), outH.toDouble()))
            val rgba = Mat()
            Imgproc.cvtColor(warped, rgba, Imgproc.COLOR_GRAY2RGBA)
            val bmp = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
            Utils.matToBitmap(rgba, bmp)
            val baos = ByteArrayOutputStream()
            bmp.compress(Bitmap.CompressFormat.JPEG, jpegQuality.coerceIn(0,100), baos)
            Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
        } catch (t: Throwable) {
            Log.e("ImageProcessing", "warp/encode failed: ${t.message}", t)
            null
        }
    }
    
    /**
     * Create overlay image with debug information
     */
    fun createOverlayImage(img: Mat, detected: Boolean, detectionCounter: Int, totalFrameCounter: Int, 
                          roiOuterPx: IntArray, roiInnerPx: IntArray, bestQuad: Array<Point>?, 
                          templateBoxes: List<Box>?, H: Mat?, matchedArr: List<Any?>): Mat {
        val overlayColor = Mat()
        Imgproc.cvtColor(img, overlayColor, Imgproc.COLOR_GRAY2BGR)
        
        // Draw counter text
        val detectionRate = if (totalFrameCounter > 0) detectionCounter.toDouble() / totalFrameCounter.toDouble() else 0.0
        val detectionText = "Detections: $detectionCounter / $totalFrameCounter (${String.format("%.1f", detectionRate * 100)}%)"
        val statusText = if (detected) "DETECTED" else "SEARCHING"
        val statusColor = if (detected) Scalar(0.0, 255.0, 0.0) else Scalar(0.0, 0.0, 255.0)
        
        Imgproc.putText(overlayColor, detectionText, Point(10.0, 30.0), Imgproc.FONT_HERSHEY_SIMPLEX, 0.7, Scalar(255.0, 255.0, 255.0), 2)
        Imgproc.putText(overlayColor, statusText, Point(10.0, 60.0), Imgproc.FONT_HERSHEY_SIMPLEX, 0.9, statusColor, 2)
        
        // Draw ROIs
        Imgproc.rectangle(overlayColor, Point(roiOuterPx[0].toDouble(), roiOuterPx[1].toDouble()), 
                         Point((roiOuterPx[0]+roiOuterPx[2]).toDouble(), (roiOuterPx[1]+roiOuterPx[3]).toDouble()), 
                         Scalar(0.0,0.0,255.0), 2)
        Imgproc.rectangle(overlayColor, Point(roiInnerPx[0].toDouble(), roiInnerPx[1].toDouble()), 
                         Point((roiInnerPx[0]+roiInnerPx[2]).toDouble(), (roiInnerPx[1]+roiInnerPx[3]).toDouble()), 
                         Scalar(255.0,0.0,0.0), 2)

        // Draw best screen quad if available
        if (bestQuad != null) {
            val q = bestQuad!!
            Imgproc.line(overlayColor, q[0], q[1], Scalar(0.0,255.0,0.0), 2)
            Imgproc.line(overlayColor, q[1], q[2], Scalar(0.0,255.0,0.0), 2)
            Imgproc.line(overlayColor, q[2], q[3], Scalar(0.0,255.0,0.0), 2)
            Imgproc.line(overlayColor, q[3], q[0], Scalar(0.0,255.0,0.0), 2)
        }

        // Project and draw template boxes via H (canonical -> image)
        if (H != null && !H.empty() && templateBoxes != null && templateBoxes.isNotEmpty()) {
            for (b in templateBoxes) {
                val srcPts = MatOfPoint2f(*percentBoxToPts(b, 1200, 1600)) // Default template size
                val projPts = MatOfPoint2f()
                Core.perspectiveTransform(srcPts, projPts, H)
                val arr = projPts.toArray()
                val poly = MatOfPoint(
                    Point(arr[0].x, arr[0].y),
                    Point(arr[1].x, arr[1].y),
                    Point(arr[2].x, arr[2].y),
                    Point(arr[3].x, arr[3].y)
                )
                Imgproc.polylines(overlayColor, listOf(poly), true, Scalar(0.0,128.0,255.0), 2)
            }
        }

        // Draw matched rects (green)
        for (m in matchedArr) {
            if (m is HashMap<*, *>) {
                val mx = (m["x"] as? Number)?.toInt() ?: continue
                val my = (m["y"] as? Number)?.toInt() ?: continue
                val mw = (m["w"] as? Number)?.toInt() ?: continue
                val mh = (m["h"] as? Number)?.toInt() ?: continue
                Imgproc.rectangle(overlayColor, Point(mx.toDouble(), my.toDouble()), 
                                 Point((mx+mw).toDouble(), (my+mh).toDouble()), Scalar(0.0,255.0,0.0), 2)
            }
        }
        
        return overlayColor
    }
}
