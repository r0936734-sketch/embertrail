# Embertrail — A Living Trail

A pure front-end 3D horse-riding game built with Three.js. No backend — everything runs in the browser (or on-device via the Android APK).

## Running in the browser

The workflow `Start application` serves the game at port 5000:

```
node_modules/.bin/serve . -p 5000
```

Open the Replit preview to play.

The browser build uses adaptive render resolution and mobile-aware budgets
for vegetation, wildlife, weather, and sky effects. It keeps the same assets
while reducing distant animation and particle work on touch devices. The
`J`/`QUESTS` panel also contains the seven-chapter story campaign, and the
terrain footprint is wider without increasing its vertex budget.

## APK (Android)

A debug APK is at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Built with Capacitor + Gradle (JDK 17 + Android SDK 34/35).

### Rebuilding the APK after code changes

```bash
# 1. Sync web assets into the android project
export JAVA_HOME=/home/runner/jdk-17.0.11+9
export PATH=$JAVA_HOME/bin:$PATH
export ANDROID_HOME=/home/runner/android-sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

cp -r index.html css js bgm.mp3 horse.mp3 rear.mp3 favicon.ico favicon.svg download.jpg me.jpg www/
npx cap sync android

# 2. Build
cd android && ./gradlew assembleDebug --no-daemon
```

The APK ends up at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Game controls

| Input | Action |
|---|---|
| Joystick / WASD / Arrows | Move |
| Drag screen | Look around |
| Scroll / pinch | Zoom |
| Shift / GALLOP button | Gallop |
| E / ACTION button | Mount / dismount / interact |
| H / CALL button | Call horse |
| F / AIM button | Draw bow |
| G | Collect |
| K / SEASON button | Cycle season |
| T | Sit by fire |
| R | Climb watchtower / zipline |
| J / QUESTS | View the story chapters and bounties |

## Credits

- **Created by:** Alok Singh — https://alokportfolio-gray.vercel.app/
- **Made with:** Three.js · Vanilla JS · AI Assistance
- **Audio:** All audio belongs to their respective original creators. No copyright ownership is claimed by this project.

## User preferences

- Keep the existing project structure and stack
- No backend — static files only
