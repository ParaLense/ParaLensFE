package com.htl.paralensfe.review

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

@Composable
fun ScanReviewScreen(onBack: () -> Unit, onSave: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize()) {
        Text("Review")
        Button(onClick = onBack) { Text("Back") }
        Button(onClick = onSave) { Text("Save") }
    }
}



