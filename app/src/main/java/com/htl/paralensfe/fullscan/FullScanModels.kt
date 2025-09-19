package com.htl.paralensfe.fullscan

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class FullScanRecord(
    val id: Long,
    val author: String,
    val date: String
)



