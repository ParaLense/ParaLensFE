package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.Point
import org.opencv.calib3d.Calib3d
import org.opencv.core.MatOfPoint2f
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
     * Match template boxes with detected contours
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
