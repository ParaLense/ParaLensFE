package com.htl.paralensfe.fullscan

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "paralens_fullscans")

class FullScanRepository(private val context: Context) {
    private val KEY = stringPreferencesKey("records")
    private val moshi = Moshi.Builder().build()
    private val type = Types.newParameterizedType(List::class.java, FullScanRecord::class.java)
    private val adapter = moshi.adapter<List<FullScanRecord>>(type)

    val records: Flow<List<FullScanRecord>> = context.dataStore.data.map { prefs ->
        prefs[KEY]?.let { json -> adapter.fromJson(json).orEmpty() } ?: emptyList()
    }

    suspend fun save(records: List<FullScanRecord>) {
        context.dataStore.edit { prefs ->
            prefs[KEY] = adapter.toJson(records)
        }
    }
}



