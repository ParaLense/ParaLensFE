package com.htl.paralensfe.fullscan

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class FullScanViewModel(app: Application) : AndroidViewModel(app) {
    private val repo = FullScanRepository(app)
    private val selectedId = MutableStateFlow<Long?>(null)

    val fullScans: StateFlow<List<FullScanRecord>> = repo.records.stateIn(
        viewModelScope, SharingStarted.Eagerly, emptyList()
    )
    val selected: StateFlow<Long?> = selectedId

    fun select(id: Long?) { selectedId.value = id }

    fun create(author: String) {
        viewModelScope.launch {
            val list = fullScans.value.toMutableList()
            val record = FullScanRecord(id = System.currentTimeMillis(), author = author.ifBlank { "Unbekannt" }, date = java.time.Instant.now().toString())
            list.add(record)
            repo.save(list)
            selectedId.value = record.id
        }
    }
}



