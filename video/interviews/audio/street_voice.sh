#!/bin/bash
# Voice track for StreetReveal: boost the two shoppers' lines (they are off-mic, 10-13 dB under the host), then denoise.
# usage: street_voice.sh int.mp4 voice_dn.wav
G=""
for w in "25.9 27.1 12" "35.5 38.3 12" "46.8 50.1 10" "110.4 110.8 9" "112.45 114.9 7" "130.0 130.4 9" "132.1 134.6 9" "134.85 137.1 10" "165.95 166.8 7" "184.75 187.55 13" "188.4 190.3 9" "190.6 190.9 9"; do
  set -- $w; G="${G}volume=${3}dB:enable='between(t,$1,$2)',"
done
ffmpeg -v error -y -i "$1" -vn -ac 1 -ar 48000 -af "${G}highpass=f=120,lowpass=f=8500,afftdn=nr=30:nf=-28:tn=1:om=o,anlmdn=s=0.0008:p=0.002:r=0.006,agate=threshold=0.008:ratio=2:attack=8:release=250:range=0.4,alimiter=limit=0.9" "$2"
