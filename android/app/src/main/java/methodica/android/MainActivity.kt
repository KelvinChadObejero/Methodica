package methodica.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import methodica.android.data.DeviceWorkspaceStore
import methodica.android.theme.MethodicaTheme
import methodica.android.ui.MethodicaApp
import methodica.android.viewmodel.MethodicaViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val factory = viewModelFactory {
            initializer { MethodicaViewModel(DeviceWorkspaceStore(noBackupFilesDir)) }
        }
        val model = ViewModelProvider(this, factory)[MethodicaViewModel::class.java]
        setContent {
            MethodicaTheme {
                MethodicaApp(model)
            }
        }
    }
}
