package com.htl.paralensfe.network

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ScanDto(
    val id: Long,
    val author: String,
    val date: String
)

@JsonClass(generateAdapter = true)
data class CreateScanRequest(
    val author: String,
    val date: String
)

@JsonClass(generateAdapter = true)
data class ApiResponse<T>(
    val data: T,
    val success: Boolean,
    val message: String? = null
)



