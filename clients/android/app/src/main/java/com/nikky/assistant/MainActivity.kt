package com.nikky.assistant

import android.app.Activity
import android.os.Bundle

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Native UI shell intentionally remains minimal until backend URL and auth are configured.
        // Privileged actions must be proposed to Nikky Core rather than executed locally.
    }
}
