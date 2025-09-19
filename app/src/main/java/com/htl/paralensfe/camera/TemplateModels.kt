package com.htl.paralensfe.camera

import android.content.Context
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types

@JsonClass(generateAdapter = true)
data class TemplateBox(
    val id: String,
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double,
    val label: String
)

enum class TemplateLayout(val assetFile: String) {
    ScreenDetection("templates/0. Bildschirmaufbau_Screendetection.json"),
}

object TemplateLoader {
    private val moshi: Moshi = Moshi.Builder().build()
    private val type = Types.newParameterizedType(List::class.java, TemplateBox::class.java)
    private val adapter = moshi.adapter<List<TemplateBox>>(type)

    fun load(context: Context, layout: TemplateLayout): List<TemplateBox> {
        val asset = layout.assetFile
        context.assets.open(asset).use { input ->
            val json = input.bufferedReader().readText()
            return adapter.fromJson(json).orEmpty()
        }
    }
}

