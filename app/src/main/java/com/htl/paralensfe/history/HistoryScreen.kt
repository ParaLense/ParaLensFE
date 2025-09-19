package com.htl.paralensfe.history

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import com.htl.paralensfe.network.NetworkModule
import com.htl.paralensfe.network.ScanDto

@Composable
fun HistoryScreenCompose() {
    val itemsState = remember { mutableStateOf<List<ScanDto>>(emptyList()) }
    LaunchedEffect(Unit) {
        kotlin.runCatching { NetworkModule.api.getScans() }
            .onSuccess { itemsState.value = it }
    }
    LazyColumn(modifier = Modifier.fillMaxSize()) {
        items(itemsState.value) { s ->
            Text("#${s.id} ${s.author} · ${s.date}")
        }
    }
}


