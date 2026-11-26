#!/usr/bin/env bash
# Essai de bout en bout sur l'émulateur Android.
set -euo pipefail
mkdir -p "$RUNNER_TEMP/captures"
APP=com.christophe.pixelpulse
DIR=/sdcard/Movies

ffmpeg -loglevel error -f lavfi -i testsrc=duration=8:size=1280x720:rate=30 -b:v 8M -pix_fmt yuv420p "$RUNNER_TEMP/gros.mp4"
ffmpeg -loglevel error -f lavfi -i testsrc=duration=1:size=320x240:rate=15 -pix_fmt yuv420p "$RUNNER_TEMP/petit.mp4"
# Le stockage partagé peut être prêt après la fin du démarrage
for i in $(seq 1 60); do
  adb shell "mkdir -p $DIR && touch $DIR/sonde.mp4 && rm $DIR/sonde.mp4" && break
  sleep 2
done
adb push "$RUNNER_TEMP/gros.mp4" /data/local/tmp/gros.mp4
adb shell "cp /data/local/tmp/gros.mp4 '$DIR/essai gros #1.mp4'"
adb push "$RUNNER_TEMP/petit.mp4" "$DIR/essai petit.mp4"
# deux copies identiques et un fichier daté de 2024
ffmpeg -loglevel error -f lavfi -i testsrc2=duration=2:size=640x360:rate=24 -pix_fmt yuv420p "$RUNNER_TEMP/double.mp4"
ffmpeg -loglevel error -f lavfi -i smptebars=duration=3:size=320x240:rate=10 -pix_fmt yuv420p "$RUNNER_TEMP/vieux.mp4"
adb push "$RUNNER_TEMP/double.mp4" "$DIR/essai double A.mp4"
adb push "$RUNNER_TEMP/double.mp4" "$DIR/essai double B.mp4"
adb push "$RUNNER_TEMP/vieux.mp4" "$DIR/essai vieux.mp4"
adb shell "touch -t 202401010000 '$DIR/essai vieux.mp4'"
adb shell content call --uri content://media --method scan_volume --arg external_primary
sleep 5

adb install "$RUNNER_TEMP/essai.apk"
adb shell pm grant $APP android.permission.READ_MEDIA_VIDEO
adb shell pm grant $APP android.permission.READ_MEDIA_IMAGES

# batterie simulée, pour vérifier les valeurs affichées
adb shell dumpsys battery unplug
adb shell dumpsys battery set level 73
adb shell dumpsys battery set temp 312

status=0
(cd "$RUNNER_TEMP/captures" && "$HOME/.maestro/bin/maestro" test "$GITHUB_WORKSPACE/tests/maestro/menage.yaml" --debug-output "$RUNNER_TEMP/captures/debug") || status=$?
adb exec-out screencap -p > "$RUNNER_TEMP/captures/fin.png" || true
adb logcat -d -s ReactNativeJS:V AndroidRuntime:E > "$RUNNER_TEMP/captures/logcat.txt" || true
cat "$RUNNER_TEMP/captures/logcat.txt"
[ "$status" -eq 0 ] || exit "$status"

# Les fichiers supprimés doivent avoir disparu, les autres rester
list=$(adb shell ls "$DIR")
echo "$list"
[ "$(echo "$list" | grep -c 'essai double')" -eq 1 ]
[ "$(echo "$list" | grep -c 'essai gros')" -eq 0 ]
echo "$list" | grep -q "essai petit"
echo "$list" | grep -q "essai vieux"
adb shell dumpsys appwidget | grep -m3 PixelWidget
