package com.alex8734.visioncamerascreendetector.visioncamerascreendetector

import android.util.Log
import org.opencv.android.Utils
import org.opencv.core.Mat
import org.opencv.imgproc.Imgproc
import android.graphics.Bitmap
import java.io.ByteArrayOutputStream
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import kotlin.concurrent.thread

/**
 * Einfacher MJPEG-Debug-Webserver.
 * Aufruf im Browser: http://<device-ip>:<port>/  (zeigt Liste)
 * Einzelner Stream:   http://<device-ip>:<port>/stream/<name>
 *
 * Voraussetzung: INTERNET Permission im Manifest der App.
 */
object DebugHttpStreamer {
  private val running = AtomicBoolean(false)
  private var port: Int = 0
  private var serverThread: Thread? = null
  private val streams = ConcurrentHashMap<String, AtomicReference<ByteArray>>()

  /** Startet den Server falls nicht bereits laufend. */
  @Synchronized
  fun start(port: Int) {
    if (port <= 0) return
    if (running.get() && this.port == port) return
    if (running.get()) {
      // anderer Port angefordert -> alten stoppen
      stop()
    }
    this.port = port
    running.set(true)
    serverThread = thread(name = "MJPEG-DebugServer", isDaemon = true) {
      try {
        ServerSocket(port).use { server ->
          Log.d("DebugHttpStreamer", "Server gestartet auf Port $port")
          while (running.get()) {
            val client = server.accept()
            thread(isDaemon = true) { handleClient(client) }
          }
        }
      } catch (t: Throwable) {
        Log.e("DebugHttpStreamer", "Fehler: ${t.message}")
        running.set(false)
      }
    }
  }

  fun stop() {
    running.set(false)
    try { serverThread?.interrupt() } catch (_: Throwable) {}
  }

  /** Aktualisiert/legt einen Stream mit fertigen JPEG Bytes an. */
  fun updateStream(name: String, jpeg: ByteArray?) {
    if (!running.get() || jpeg == null) return
    val ref = streams.getOrPut(name) { AtomicReference() }
    ref.set(jpeg)
  }

  /** Convenience: Graues Mat (1-Kanal) -> JPEG streamen */
  fun updateMatGray(name: String, mat: Mat, quality: Int = 70) {
    if (!running.get()) return
    try {
      val rgba = Mat()
      Imgproc.cvtColor(mat, rgba, Imgproc.COLOR_GRAY2RGBA)
      matToJpeg(rgba, quality)?.let { updateStream(name, it) }
    } catch (_: Throwable) {}
  }

  /** Convenience: BGR oder RGBA Mat -> JPEG streamen */
  fun updateMatColor(name: String, mat: Mat, quality: Int = 70) {
    if (!running.get()) return
    try {
      matToJpeg(mat, quality)?.let { updateStream(name, it) }
    } catch (_: Throwable) {}
  }

  private fun matToJpeg(mat: Mat, quality: Int): ByteArray? {
    return try {
      val bmp = Bitmap.createBitmap(mat.cols(), mat.rows(), Bitmap.Config.ARGB_8888)
      Utils.matToBitmap(mat, bmp)
      val baos = ByteArrayOutputStream()
      bmp.compress(Bitmap.CompressFormat.JPEG, quality.coerceIn(0,100), baos)
      baos.toByteArray()
    } catch (t: Throwable) {
      null
    }
  }

  private fun handleClient(sock: Socket) {
    try {
      sock.getInputStream().bufferedReader().use { reader ->
        val requestLine = reader.readLine() ?: return
        val path = requestLine.split(" ").getOrNull(1) ?: "/"
        // Header überspringen
        while (true) {
          val line = reader.readLine() ?: break
          if (line.isEmpty()) break
        }
        sock.getOutputStream().use { out ->
          when {
            path == "/" -> respondIndex(out)
            path.startsWith("/stream/") -> respondStream(out, path.removePrefix("/stream/"))
            else -> respond404(out)
          }
        }
      }
    } catch (_: Throwable) {} finally {
      try { sock.close() } catch (_: Throwable) {}
    }
  }

  private fun respondIndex(out: java.io.OutputStream) {
    val list = streams.keys().toList().sorted()
    val html = buildString {
      append("<html><head><meta charset='utf-8'><title>Debug Streams</title></head><body>")
      append("<h1>MJPEG Debug Streams</h1>")
      if (list.isEmpty()) append("<p>No streams yet...</p>") else {
        for (s in list) {
          append("<div style='margin:12px 0'>")
          append("<h3 style='margin:4px 0'>").append(s).append("</h3>")
          append("<img src='/stream/").append(s).append("' style='max-width:45%;border:1px solid #888;box-shadow:0 0 4px #0002' />")
          append("</div>")
        }
      }
      append("<hr><small>DebugHttpStreamer running on port ").append(port).append("</small>")
      append("</body></html>")
    }
    val bytes = html.toByteArray(Charsets.UTF_8)
    out.write("HTTP/1.0 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: ${bytes.size}\r\nCache-Control: no-cache\r\nPragma: no-cache\r\n\r\n".toByteArray())
    out.write(bytes)
  }

  private fun respond404(out: java.io.OutputStream) {
    val msg = "Not found".toByteArray()
    out.write("HTTP/1.0 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: ${msg.size}\r\n\r\n".toByteArray())
    out.write(msg)
  }

  private fun respondStream(out: java.io.OutputStream, name: String) {
    out.write(
      ("HTTP/1.0 200 OK\r\n" +
        "Connection: close\r\n" +
        "Cache-Control: no-cache, no-store, must-revalidate\r\n" +
        "Pragma: no-cache\r\n" +
        "Content-Type: multipart/x-mixed-replace; boundary=FRAME\r\n\r\n").toByteArray()
    )
    val boundary = "--FRAME\r\n"
    val ref = streams.getOrPut(name) { AtomicReference() }
    try {
      while (running.get()) {
        val jpeg = ref.get()
        if (jpeg != null) {
          out.write(boundary.toByteArray())
          out.write("Content-Type: image/jpeg\r\nContent-Length: ${jpeg.size}\r\n\r\n".toByteArray())
          out.write(jpeg)
          out.write("\r\n".toByteArray())
          out.flush()
        }
        Thread.sleep(250) // ~4 FPS
      }
    } catch (_: Throwable) { }
  }
}

