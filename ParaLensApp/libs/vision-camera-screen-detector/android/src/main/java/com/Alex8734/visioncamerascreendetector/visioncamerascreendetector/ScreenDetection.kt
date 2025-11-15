package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.calib3d.Calib3d
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Scalar
import org.opencv.core.CvType
import org.opencv.imgproc.Imgproc
import android.util.Log
import java.util.HashMap
import java.util.ArrayList
import kotlin.math.max
import kotlin.math.min

/**
 * Handles screen detection and template matching logic
 */
object ScreenDetection {
    
    /**
     * Parse template boxes from arguments
     */
    fun parseTemplate(argMap: Map<String, Any>?, pluginOptions: Map<String, Any>?): List<Box>? {
        val src = Utils.getList(argMap, "template") ?: Utils.getList(pluginOptions, "template") ?: return null
        val out = mutableListOf<Box>()
        for (e in src) {
            val m = e as? Map<*, *> ?: continue
            val id = (m["id"] as? String) ?: m["id"]?.toString()
            val x = (m["x"] as? Number)?.toDouble() ?: (m["x"] as? String)?.toDoubleOrNull()
            val y = (m["y"] as? Number)?.toDouble() ?: (m["y"] as? String)?.toDoubleOrNull()
            val w = (m["width"] as? Number)?.toDouble() ?: (m["width"] as? String)?.toDoubleOrNull()
            val h = (m["height"] as? Number)?.toDouble() ?: (m["height"] as? String)?.toDoubleOrNull()
            if (x != null && y != null && w != null && h != null) out.add(Box(id, x, y, w, h))
        }
        return if (out.isEmpty()) null else out
    }
    
    /**
     * Find the best screen candidate from contours
     */
    fun findBestScreenCandidate(
        screenContours: List<org.opencv.core.MatOfPoint>,
        roiInnerPx: IntArray,
        roiOuterPx: IntArray,
        frameW: Int,
        frameH: Int
    ): Triple<IntArray?, Array<Point>?, Double> {
        val approx = MatOfPoint2f()
        val tmp2f = MatOfPoint2f()
        var bestRect: IntArray? = null
        var bestQuad: Array<Point>? = null
        var bestScore = 0.0
        val allRects = ArrayList<HashMap<String, Any?>>()
        
        for (cnt in screenContours) {
            tmp2f.fromArray(*cnt.toArray())
            val perim = org.opencv.imgproc.Imgproc.arcLength(tmp2f, true)
            org.opencv.imgproc.Imgproc.approxPolyDP(tmp2f, approx, 0.02 * perim, true)
            if (approx.total().toInt() != 4) continue
            
            val pts = approx.toArray()
            var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
            var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
            for (p in pts) { 
                if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y
                if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y 
            }
            val x = max(0, minX.toInt()); val y = max(0, minY.toInt())
            val wpx = min(frameW - x, (maxX - minX).toInt()); val hpx = min(frameH - y, (maxY - minY).toInt())
            if (wpx <= 0 || hpx <= 0) continue
            
            val rect = intArrayOf(x, y, wpx, hpx)
            // collect for debug
            run { 
                val m = HashMap<String, Any?>(); 
                m["x"] = x; m["y"] = y; m["w"] = wpx; m["h"] = hpx; 
                allRects.add(m) 
            }
            
            if (!Utils.rectWithinRoi(rect, roiInnerPx, roiOuterPx, 12)) continue
            
            val bbox = intArrayOf(x, y, wpx, hpx)
            val score = Utils.iou(bbox, bbox) // IoU with itself ~ 1.0, but keep for extensibility
            if (score > bestScore) {
                bestScore = score
                bestRect = rect
                bestQuad = ImageProcessing.orderQuad(arrayOf(pts[0], pts[1], pts[2], pts[3]))
            }
        }
        
        return Triple(bestRect, bestQuad, bestScore)
    }
    
    /**
     * Build homography matrix for screen transformation
     */
    fun buildScreenHomography(bestQuad: Array<Point>, templateTargetW: Int, templateTargetH: Int): Mat? {
        if (bestQuad.isEmpty()) return null
        
        // Build H as canonical (template) -> image space
        val src = MatOfPoint2f(
            Point(0.0, 0.0),
            Point(templateTargetW.toDouble(), 0.0),
            Point(templateTargetW.toDouble(), templateTargetH.toDouble()),
            Point(0.0, templateTargetH.toDouble())
        )
        val dst = MatOfPoint2f()
        dst.fromArray(*bestQuad)
        return Calib3d.findHomography(src, dst, Calib3d.RANSAC, 3.0)
    }
    
    /**
     * Match template boxes with detected contours (legacy method)
     */
    fun matchTemplateBoxes(
        templateBoxes: List<Box>,
        H: Mat,
        contourRects: List<IntArray>,
        frameW: Int,
        frameH: Int,
        templateTargetW: Int,
        templateTargetH: Int,
        minIouForMatch: Double
    ): Pair<Double, List<Any?>> {
        var matches = 0
        val matchedArr = ArrayList<Any?>()
        val templatePixelRectsArr = ArrayList<HashMap<String, Any?>>()
        
        for (b in templateBoxes) {
            val pts = MatOfPoint2f(*ImageProcessing.percentBoxToPts(b, templateTargetW, templateTargetH))
            val proj = MatOfPoint2f()
            // Project canonical template box into image using H (canonical -> image)
            Core.perspectiveTransform(pts, proj, H)
            val arr = proj.toArray()
            var minX = Double.POSITIVE_INFINITY; var minY = Double.POSITIVE_INFINITY
            var maxX = Double.NEGATIVE_INFINITY; var maxY = Double.NEGATIVE_INFINITY
            for (p in arr) { 
                if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y
                if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y 
            }
            val rx = max(0, minX.toInt()); val ry = max(0, minY.toInt())
            val rw = min(frameW - rx, (maxX - minX).toInt()); val rh = min(frameH - ry, (maxY - minY).toInt())
            
            val rectMap = HashMap<String, Any?>(); 
            rectMap["x"] = rx; rectMap["y"] = ry; rectMap["w"] = rw; rectMap["h"] = rh; 
            templatePixelRectsArr.add(rectMap)

            var best = 0.0; var bestRectForThis: IntArray? = null
            for (cr in contourRects) {
                val sc = Utils.iou(intArrayOf(rx, ry, rw, rh), cr)
                if (sc > best) { best = sc; bestRectForThis = cr }
            }
            
            if (bestRectForThis != null && best >= minIouForMatch) {
                matches += 1
                val mm = HashMap<String, Any?>(); 
                mm["x"] = bestRectForThis[0]; mm["y"] = bestRectForThis[1]; 
                mm["w"] = bestRectForThis[2]; mm["h"] = bestRectForThis[3]
                matchedArr.add(mm)
            } else {
                matchedArr.add(null)
            }
        }
        
        val accuracy = if (templateBoxes.isNotEmpty()) matches.toDouble() / templateBoxes.size.toDouble() else 0.0
        return Pair(accuracy, matchedArr)
    }
    
    /**
     * Match template boxes in warped image using region-based verification with padding
     * This method is more robust for small boxes as it works directly in the warped space
     */
    fun matchTemplateBoxesInWarped(
        templateBoxes: List<Box>,
        warped: Mat,
        outputW: Int,
        outputH: Int,
        paddingPercent: Double = 1.0,
        minScoreForMatch: Double = 0.4
    ): Triple<Double, List<Any?>, List<HashMap<String, Any?>>> {
        var matches = 0
        val matchedArr = ArrayList<Any?>()
        val templatePixelRectsArr = ArrayList<HashMap<String, Any?>>()
        
        for (b in templateBoxes) {
            // Calculate box dimensions
            val boxW = (b.w / 100.0) * outputW
            val boxH = (b.h / 100.0) * outputH
            
            // Calculate padding (1% of box size)
            val paddingX = boxW * (paddingPercent / 100.0)
            val paddingY = boxH * (paddingPercent / 100.0)
            
            // Box coordinates with padding
            val rx = ((b.x / 100.0) * outputW - paddingX).toInt().coerceAtLeast(0)
            val ry = ((b.y / 100.0) * outputH - paddingY).toInt().coerceAtLeast(0)
            val rw = (boxW + 2 * paddingX).toInt().coerceAtMost(outputW - rx)
            val rh = (boxH + 2 * paddingY).toInt().coerceAtMost(outputH - ry)
            
            // Original box position within padded ROI
            val innerX = paddingX.toInt().coerceAtLeast(0)
            val innerY = paddingY.toInt().coerceAtLeast(0)
            val innerW = boxW.toInt().coerceAtMost(rw - innerX).coerceAtLeast(3)
            val innerH = boxH.toInt().coerceAtMost(rh - innerY).coerceAtLeast(3)
            
            // Store template pixel rect (original position without padding)
            val rectMap = HashMap<String, Any?>()
            rectMap["x"] = rx + innerX
            rectMap["y"] = ry + innerY
            rectMap["w"] = innerW
            rectMap["h"] = innerH
            templatePixelRectsArr.add(rectMap)
            
            if (rw < 5 || rh < 5 || innerW < 3 || innerH < 3) {
                matchedArr.add(null)
                continue
            }
            
            try {
                // Extract ROI with padding (so edges are visible)
                val roi = warped.submat(ry, ry + rh, rx, rx + rw)
                
                // Method 1: Edge Detection - check for edges at box borders
                val edges = Mat()
                Imgproc.Canny(roi, edges, 30.0, 80.0)
                
                // Check edges at the borders of the inner box
                val borderWidth = 2
                val topEdgeY1 = (innerY - borderWidth).coerceAtLeast(0)
                val topEdgeY2 = (innerY + borderWidth).coerceAtMost(rh)
                val bottomEdgeY1 = (innerY + innerH - borderWidth).coerceAtLeast(0)
                val bottomEdgeY2 = (innerY + innerH + borderWidth).coerceAtMost(rh)
                val leftEdgeX1 = (innerX - borderWidth).coerceAtLeast(0)
                val leftEdgeX2 = (innerX + borderWidth).coerceAtMost(rw)
                val rightEdgeX1 = (innerX + innerW - borderWidth).coerceAtLeast(0)
                val rightEdgeX2 = (innerX + innerW + borderWidth).coerceAtMost(rw)
                
                val topEdge = if (topEdgeY2 > topEdgeY1) edges.submat(topEdgeY1, topEdgeY2, innerX, innerX + innerW.coerceAtMost(rw - innerX)) else null
                val bottomEdge = if (bottomEdgeY2 > bottomEdgeY1) edges.submat(bottomEdgeY1, bottomEdgeY2, innerX, innerX + innerW.coerceAtMost(rw - innerX)) else null
                val leftEdge = if (leftEdgeX2 > leftEdgeX1) edges.submat(innerY, innerY + innerH.coerceAtMost(rh - innerY), leftEdgeX1, leftEdgeX2) else null
                val rightEdge = if (rightEdgeX2 > rightEdgeX1) edges.submat(innerY, innerY + innerH.coerceAtMost(rh - innerY), rightEdgeX1, rightEdgeX2) else null
                
                val topEdgeCount = topEdge?.let { Core.countNonZero(it).toDouble() } ?: 0.0
                val bottomEdgeCount = bottomEdge?.let { Core.countNonZero(it).toDouble() } ?: 0.0
                val leftEdgeCount = leftEdge?.let { Core.countNonZero(it).toDouble() } ?: 0.0
                val rightEdgeCount = rightEdge?.let { Core.countNonZero(it).toDouble() } ?: 0.0
                
                val totalBorderPixels = (innerW * borderWidth * 2 + innerH * borderWidth * 2).toDouble().coerceAtLeast(1.0)
                val borderEdgeRatio = (topEdgeCount + bottomEdgeCount + leftEdgeCount + rightEdgeCount) / totalBorderPixels
                
                // Method 2: Corner Detection
                val corners = Mat()
                Imgproc.cornerHarris(roi, corners, 2, 3, 0.04)
                val cornerMax = Core.minMaxLoc(corners)
                val threshold = cornerMax.maxVal * 0.01
                val cornerMask = Mat()
                Core.compare(corners, Scalar(threshold), cornerMask, Core.CMP_GT)
                
                // Check corners near box corners
                val cornerSize = 3
                val cornersAtBoxEdges = arrayOf(
                    // Top-left
                    if (innerY >= cornerSize && innerX >= cornerSize) {
                        val cornerRoi = cornerMask.submat(innerY - cornerSize, innerY + cornerSize, innerX - cornerSize, innerX + cornerSize)
                        Core.countNonZero(cornerRoi) > 0
                    } else false,
                    // Top-right
                    if (innerY >= cornerSize && innerX + innerW + cornerSize <= rw) {
                        val cornerRoi = cornerMask.submat(innerY - cornerSize, innerY + cornerSize, innerX + innerW - cornerSize, innerX + innerW + cornerSize)
                        Core.countNonZero(cornerRoi) > 0
                    } else false,
                    // Bottom-left
                    if (innerY + innerH + cornerSize <= rh && innerX >= cornerSize) {
                        val cornerRoi = cornerMask.submat(innerY + innerH - cornerSize, innerY + innerH + cornerSize, innerX - cornerSize, innerX + cornerSize)
                        Core.countNonZero(cornerRoi) > 0
                    } else false,
                    // Bottom-right
                    if (innerY + innerH + cornerSize <= rh && innerX + innerW + cornerSize <= rw) {
                        val cornerRoi = cornerMask.submat(innerY + innerH - cornerSize, innerY + innerH + cornerSize, innerX + innerW - cornerSize, innerX + innerW + cornerSize)
                        Core.countNonZero(cornerRoi) > 0
                    } else false
                )
                val cornerScore = cornersAtBoxEdges.count { it }.toDouble() / 4.0
                
                // Method 3: Gradient Verification at box borders
                val gradX = Mat()
                val gradY = Mat()
                Imgproc.Sobel(roi, gradX, CvType.CV_64F, 1, 0, 3)
                Imgproc.Sobel(roi, gradY, CvType.CV_64F, 0, 1, 3)
                val magnitude = Mat()
                Core.magnitude(gradX, gradY, magnitude)
                
                // Check gradients at top and bottom borders
                val topGradY1 = (innerY - 1).coerceAtLeast(0)
                val topGradY2 = (innerY + 1).coerceAtMost(rh)
                val bottomGradY1 = (innerY + innerH - 1).coerceAtLeast(0)
                val bottomGradY2 = (innerY + innerH + 1).coerceAtMost(rh)
                
                val topGrad = if (topGradY2 > topGradY1) magnitude.submat(topGradY1, topGradY2, innerX, innerX + innerW.coerceAtMost(rw - innerX)) else null
                val bottomGrad = if (bottomGradY2 > bottomGradY1) magnitude.submat(bottomGradY1, bottomGradY2, innerX, innerX + innerW.coerceAtMost(rw - innerX)) else null
                
                val avgTopGrad = topGrad?.let { Core.mean(it).`val`[0] } ?: 0.0
                val avgBottomGrad = bottomGrad?.let { Core.mean(it).`val`[0] } ?: 0.0
                val avgBorderGrad = (avgTopGrad + avgBottomGrad) / 2.0
                
                // Combined score
                val edgeScore = if (borderEdgeRatio > 0.1) 0.5 else (borderEdgeRatio * 5.0).coerceAtMost(0.5)
                val cornerScoreWeighted = cornerScore * 0.3
                val gradientScore = if (avgBorderGrad > 15.0) 0.2 else 0.0
                
                val totalScore = edgeScore + cornerScoreWeighted + gradientScore
                
                val hasMatch = totalScore >= minScoreForMatch
                
                // Debug logging for each box
                Log.d("BoxMatch", "Box ${b.id}: score=$totalScore (edge=$edgeScore, corner=$cornerScoreWeighted, grad=$gradientScore), " +
                    "borderRatio=$borderEdgeRatio, cornersFound=${cornersAtBoxEdges.count { it }}/4, avgGrad=$avgBorderGrad, " +
                    "matched=$hasMatch")
                
                if (hasMatch) {
                    matches++
                    val mm = HashMap<String, Any?>()
                    // Return original position (without padding)
                    mm["x"] = rx + innerX
                    mm["y"] = ry + innerY
                    mm["w"] = innerW
                    mm["h"] = innerH
                    mm["score"] = totalScore
                    mm["borderEdgeRatio"] = borderEdgeRatio
                    mm["cornerScore"] = cornerScore
                    mm["avgBorderGrad"] = avgBorderGrad
                    mm["boxId"] = b.id  // Add box ID for debugging
                    matchedArr.add(mm)
                    Log.d("BoxMatch", "✅ MATCHED: Box ${b.id} at (${rx + innerX}, ${ry + innerY}) size ${innerW}x${innerH}")
                } else {
                    matchedArr.add(null)
                    Log.d("BoxMatch", "❌ NOT MATCHED: Box ${b.id} (score $totalScore < threshold $minScoreForMatch)")
                }
            } catch (e: Exception) {
                // If ROI extraction fails, skip this box
                matchedArr.add(null)
            }
        }
        
        val accuracy = if (templateBoxes.isNotEmpty()) matches.toDouble() / templateBoxes.size.toDouble() else 0.0
        Log.d("BoxMatch", "=== Summary: $matches/${templateBoxes.size} boxes matched (accuracy: ${String.format("%.2f", accuracy * 100)}%) ===")
        return Triple(accuracy, matchedArr, templatePixelRectsArr)
    }
    
    /**
     * Create screen detection result data
     */
    fun createScreenData(
        detected: Boolean,
        accuracy: Double,
        accuracyThreshold: Double,
        detectionCounter: Int,
        totalFrameCounter: Int,
        frameW: Int,
        frameH: Int,
        srcWidth: Int,
        srcHeight: Int,
        screenAspectW: Int,
        screenAspectH: Int,
        templateTargetW: Int,
        templateTargetH: Int,
        H: Mat?,
        mask: Mat?,
        roiOuterPx: IntArray,
        roiInnerPx: IntArray,
        bestRect: IntArray?,
        allRects: List<HashMap<String, Any?>>,
        templatePixelRectsArr: List<HashMap<String, Any?>>,
        matchedArr: List<Any?>,
        warpedImageBase64: String?,
        outputW: Int,
        outputH: Int
    ): HashMap<String, Any?> {
        val screenData = HashMap<String, Any?>()
        
        // Basic detection info
        screenData["width"] = frameW
        screenData["height"] = frameH
        screenData["detected"] = detected
        screenData["accuracy"] = accuracy
        screenData["accuracy_threshold"] = accuracyThreshold
        screenData["detection_count"] = detectionCounter
        screenData["total_frames"] = totalFrameCounter
        screenData["detection_rate"] = if (totalFrameCounter > 0) detectionCounter.toDouble() / totalFrameCounter.toDouble() else 0.0
        
        // Frame size info
        val origSize = HashMap<String, Any?>(); 
        origSize["w"] = srcWidth; origSize["h"] = srcHeight; 
        screenData["source_frame_size"] = origSize
        
        // Aspect ratio info
        val aspect = HashMap<String, Any?>(); 
        aspect["w"] = screenAspectW; aspect["h"] = screenAspectH; 
        screenData["screen_aspect"] = aspect
        
        // Template size info
        val tSize = HashMap<String, Any?>(); 
        tSize["w"] = templateTargetW; tSize["h"] = templateTargetH; 
        screenData["template_target_size"] = tSize

        // Homography matrix
        if (H != null && !H.empty()) {
            val hRows = ArrayList<ArrayList<Double>>(); 
            val buf = DoubleArray(H.cols())
            for (r in 0 until H.rows()) { 
                val rowArr = ArrayList<Double>(H.cols()); 
                H.row(r).get(0,0,buf); 
                for (c in buf.indices) rowArr.add(buf[c]); 
                hRows.add(rowArr) 
            }
            screenData["homography"] = hRows
        } else screenData["homography"] = null

        // Homography inliers mask
        if (mask != null && !mask.empty()) {
            val mArr = ArrayList<Int>(); 
            val mBytes = ByteArray(mask.rows() * mask.cols()); 
            mask.get(0,0,mBytes); 
            for (b in mBytes) mArr.add(if (b.toInt()==0) 0 else 1); 
            screenData["homography_inliers_mask"] = mArr
        } else screenData["homography_inliers_mask"] = null

        // ROI info
        val roiOuterMap = HashMap<String, Any?>(); 
        roiOuterMap["x"] = roiOuterPx[0]; roiOuterMap["y"] = roiOuterPx[1]; 
        roiOuterMap["w"] = roiOuterPx[2]; roiOuterMap["h"] = roiOuterPx[3]
        val roiInnerMap = HashMap<String, Any?>(); 
        roiInnerMap["x"] = roiInnerPx[0]; roiInnerMap["y"] = roiInnerPx[1]; 
        roiInnerMap["w"] = roiInnerPx[2]; roiInnerMap["h"] = roiInnerPx[3]
        screenData["roi_outer_px"] = roiOuterMap
        screenData["roi_inner_px"] = roiInnerMap
        
        // Best screen rectangle
        if (bestRect != null) {
            val r = bestRect!!
            val br = HashMap<String, Any?>(); 
            br["x"] = r[0]; br["y"] = r[1]; br["w"] = r[2]; br["h"] = r[3]
            screenData["screen_rect"] = br
        }
        
        screenData["all_detected_rects"] = allRects
        
        // Template rect for UI viewport mapping (use outer ROI)
        val templateRect = HashMap<String, Any?>(); 
        templateRect["x"] = roiOuterPx[0]; templateRect["y"] = roiOuterPx[1]; 
        templateRect["w"] = roiOuterPx[2]; templateRect["h"] = roiOuterPx[3]; 
        screenData["template_rect"] = templateRect

        // Template and match info
        if (templatePixelRectsArr.isNotEmpty()) screenData["template_pixel_boxes"] = templatePixelRectsArr
        if (matchedArr.isNotEmpty()) screenData["matched_boxes"] = matchedArr

        // Warped image
        warpedImageBase64?.let {
            screenData["image_base64"] = it
            screenData["image_format"] = "jpeg"
            val imap = HashMap<String, Any?>()
            imap["w"] = outputW
            imap["h"] = outputH
            screenData["image_size"] = imap
        }
        
        return screenData
    }
}
