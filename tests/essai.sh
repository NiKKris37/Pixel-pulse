#!/usr/bin/env bash
# Essai de bout en bout sur l'émulateur Android.
set -euo pipefail
mkdir -p "$RUNNER_TEMP/captures"
APP=com.christophe.pixelpulse
DIR=/sdcard/Movies

ffmpeg -loglevel error -f lavfi -i testsrc=duration=8:size=1280x720:rate=30 -b:v 8M -pix_fmt yuv420p "$RUNNER_TEMP/gros.mp4"
ffmpeg -loglevel error -f lavfi -i testsrc=duration=1:size=320x240:rate=15 -pix_fmt yuv420p "$RUNNER_TEMP/petit.mp4"
adb shell mkdir -p $DIR
adb push "$RUNNER_TEMP/gros.mp4" "$DIR/essai gros #1.mp4"
adb push "$RUNNER_TEMP/petit.mp4" "$DIR/essai petit.mp4"
adb shell content call --uri content://media --method scan_volume --arg external_primary
sleep 5

adb install "$RUNNER_TEMP/essai.apk"
adb shell pm grant $APP android.permission.READ_MEDIA_VIDEO
adb shell pm grant $APP android.permission.READ_MEDIA_IMAGES

status=0
(cd "$RUNNER_TEMP/captures" && "$HOME/.maestro/bin/maestro" test "$GITHUB_WORKSPACE/tests/maestro/menage.yaml" --debug-output "$RUNNER_TEMP/captures/debug") || status=$?
adb exec-out screencap -p > "$RUNNER_TEMP/captures/fin.png" || true
adb logcat -d -s ReactNativeJS:V AndroidRuntime:E > "$RUNNER_TEMP/captures/logcat.txt" || true
cat "$RUNNER_TEMP/captures/logcat.txt"
[ "$status" -eq 0 ] || exit "$status"

# Le fichier supprimé doit avoir disparu, l'autre rester
adb shell ls "$DIR"
! adb shell ls "$DIR" | grep -q "essai gros"
adb shell ls "$DIR" | grep -q "essai petit"
