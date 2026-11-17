# Methodica for Android

Open `android/` as a project in Android Studio. The Gradle wrapper uses JDK 25 and the app compiles against Android SDK Platform 35. Select the `app` run configuration and start it on an Android API 24 or newer device or emulator.

Open any Kotlin file under `ui/screens/` in **Split** or **Design** view to see its light and dark phone previews.

From `android/`, run the unit tests and build the debug APK with PowerShell.

```powershell
.\gradlew.bat :app:testDebugUnitTest :app:assembleDebug
```

Run the on-device storage test with an emulator or device connected.

```powershell
.\gradlew.bat :app:connectedDebugAndroidTest
```

## Study journey

1. Confirm a fresh install shows an empty History. The dashboard offers starter study flows.
2. Create a flow with a one-minute Focus block and a one-minute Break block. Start the timer, pause briefly, then resume and let both blocks finish.
3. Open the reflection, choose comprehension and fatigue ratings, and save notes. History should show one two-minute session with two completed blocks. Only the Focus block contributes to study time.
4. Close and reopen Methodica. Confirm the saved flow and session are still available. From History, edit the reflection, reopen the app, and confirm the edit replaced the original.

The app saves flows, completed sessions, and reflections in device storage. An unfinished timer is held in memory. Account sign-in and web synchronization are future work.
