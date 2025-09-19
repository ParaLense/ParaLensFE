package com.htl.paralensfe.network

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface ApiService {
    @GET("/api/scans")
    suspend fun getScans(): List<ScanDto>

    @POST("/api/scans")
    suspend fun createScan(@Body req: CreateScanRequest): ScanDto

    @GET("/api/scans/{id}")
    suspend fun getScan(@Path("id") id: Long): ScanDto
}



