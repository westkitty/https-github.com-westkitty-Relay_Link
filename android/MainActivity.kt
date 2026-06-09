package com.relaylink

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.relaylink.services.LinkService

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                RelayLinkDashboard()
            }
        }
    }

    @Composable
    fun RelayLinkDashboard() {
        var ipAddress by remember { mutableStateOf("192.168.1.142") }
        var portNumber by remember { mutableStateOf("8765") }
        var isConnecting by remember { mutableStateOf(false) }
        var statusMsg by remember { mutableStateOf("Idle • Disconnected") }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF0A0A0C))
                .padding(24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Header Panel
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Relay Link",
                            color = Color(0xFFE0E1E5),
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "v1.0.4 • Tablet Control Panel",
                            color = Color(0xFF8E9299),
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Box(
                        modifier = Modifier
                            .background(
                                color = if (isConnecting) Color(0xFF1B3B2B) else Color(0xFF1F1F24),
                                shape = RoundedCornerShape(12.dp)
                            )
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = if (isConnecting) "Connected" else "Offline",
                            color = if (isConnecting) Color(0xFF4ADE80) else Color(0xFF8E9299),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Divider(color = Color(0xFF242428))

                // Connection Parameters Box
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0F0F12), shape = RoundedCornerShape(12.dp))
                        .border(1.dp, Color(0xFF242428), shape = RoundedCornerShape(12.dp))
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "LINK TO MACBOOK HOST",
                        color = Color(0xFF8E9299),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )

                    OutlinedTextField(
                        value = ipAddress,
                        onValueChange = { ipAddress = it },
                        label = { Text("MacBook Local IP") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF3B82F6),
                            unfocusedBorderColor = Color(0xFF2D2D33),
                            focusedLabelColor = Color(0xFF3B82F6),
                            unfocusedLabelColor = Color(0xFF8E9299),
                            focusedTextColor = Color(0xFFE0E1E5),
                            unfocusedTextColor = Color(0xFFE0E1E5)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = portNumber,
                        onValueChange = { portNumber = it },
                        label = { Text("WebSocket Port") },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF3B82F6),
                            unfocusedBorderColor = Color(0xFF2D2D33),
                            focusedLabelColor = Color(0xFF3B82F6),
                            unfocusedLabelColor = Color(0xFF8E9299),
                            focusedTextColor = Color(0xFFE0E1E5),
                            unfocusedTextColor = Color(0xFFE0E1E5)
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Button(
                        onClick = {
                            isConnecting = !isConnecting
                            if (isConnecting) {
                                statusMsg = "WebSocket connected and listening on ws://$ipAddress:$portNumber/ws"
                                // Fire Intent to Background Foreground Service
                                val intent = Intent(this@MainActivity, LinkService::class.java).apply {
                                    action = "START"
                                    putExtra("IP", ipAddress)
                                    putExtra("PORT", portNumber.toIntOrNull() ?: 8765)
                                }
                                startForegroundService(intent)
                            } else {
                                statusMsg = "Connection closed."
                                val intent = Intent(this@MainActivity, LinkService::class.java).apply {
                                    action = "STOP"
                                }
                                startService(intent)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isConnecting) Color(0xFFEF4444) else Color(0xFF3B82F6),
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(if (isConnecting) "Disconnect Relay Link" else "Connect & Link Tablet")
                    }
                }

                // Active Status Information
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0F0F12), shape = RoundedCornerShape(12.dp))
                        .border(1.dp, Color(0xFF242428), shape = RoundedCornerShape(12.dp))
                        .padding(16.dp)
                ) {
                    Text(
                        text = "STATE LOGS ENGINE",
                        color = Color(0xFF8E9299),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    Text(
                        text = statusMsg,
                        color = if (isConnecting) Color(0xFF4ADE80) else Color(0xFFC0C0C4),
                        fontSize = 12.sp,
                        fontFamily = FontFamily.Monospace
                    )
                }

                // Features indicators
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(Color(0xFF141417), shape = RoundedCornerShape(8.dp))
                            .border(1.dp, Color(0xFF242428), shape = RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Column {
                            Text("Clipboard Sync", color = Color(0xFFE0E1E5), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text("Auto-active", color = Color(0xFF4ADE80), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                        }
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .background(Color(0xFF141417), shape = RoundedCornerShape(8.dp))
                            .border(1.dp, Color(0xFF242428), shape = RoundedCornerShape(8.dp))
                            .padding(12.dp)
                    ) {
                        Column {
                            Text("Virtual KVM Overlay", color = Color(0xFFE0E1E5), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text("Accessibility Active", color = Color(0xFF3B82F6), fontSize = 10.sp, fontFamily = FontFamily.Monospace)
                        }
                    }
                }
            }
        }
    }
}
