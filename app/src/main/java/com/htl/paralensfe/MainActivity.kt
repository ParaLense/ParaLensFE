package com.htl.paralensfe

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Settings
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.lifecycle.ViewModel
import com.htl.paralensfe.ui.theme.ParaLensFETheme
import com.htl.paralensfe.review.ScanReviewScreen
import com.htl.paralensfe.R

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ParaLensFETheme {
                App()
            }
        }
    }
}

@Composable
fun App() {
    val navController = rememberNavController()
    val settingsViewModel: SettingsViewModel = viewModel()
    val dark = settingsViewModel.isDark
    val items = listOf(
        BottomDest.History,
        BottomDest.Camera,
        BottomDest.Settings
    )
    ParaLensFETheme(darkTheme = dark) {
        Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination: NavDestination? = navBackStackEntry?.destination
                items.forEach { item ->
                    val selected = currentDestination?.route == item.route
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(item.icon, contentDescription = stringResource(id = resourceIdFor(item.label))) },
                        label = { Text(stringResource(id = resourceIdFor(item.label))) }
                    )
                }
            }
        }
        ) { inner ->
            NavHost(navController, startDestination = BottomDest.Camera.route, modifier = Modifier.fillMaxSize()) {
                composable(BottomDest.History.route) { com.htl.paralensfe.history.HistoryScreenCompose() }
                composable(BottomDest.Camera.route) { com.htl.paralensfe.camera.CameraScreenCompose() }
                composable(BottomDest.Settings.route) { SettingsScreen(settingsViewModel) }
                composable("review") { ScanReviewScreen(onBack = { navController.popBackStack() }, onSave = { navController.popBackStack() }) }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    ParaLensFETheme {
        App()
    }
}

// Navigation models

sealed class BottomDest(val route: String, val label: String, val icon: ImageVector) {
    data object History : BottomDest("history", "tab_history", Icons.Filled.History)
    data object Camera : BottomDest("camera", "tab_camera", Icons.Filled.CameraAlt)
    data object Settings : BottomDest("settings", "tab_settings", Icons.Filled.Settings)
}

@Composable
fun HistoryScreen() { Text("History") }

@Composable
fun SettingsScreen(vm: SettingsViewModel) {
    val toggled = remember { mutableStateOf(0) }
    androidx.compose.material3.Button(onClick = { vm.toggleTheme(); toggled.value++ }) { Text(stringResource(id = R.string.toggle_theme)) }
}

fun resourceIdFor(name: String): Int = when (name) {
    "tab_history" -> R.string.tab_history
    "tab_camera" -> R.string.tab_camera
    "tab_settings" -> R.string.tab_settings
    else -> R.string.app_name
}
class SettingsViewModel : ViewModel() {
    // simple in-memory toggle for now; will back with DataStore
    var isDark: Boolean = false
        private set
    fun toggleTheme() { isDark = !isDark }
}