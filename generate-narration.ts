/**
 * Generate narration audio for the walkthrough video using ElevenLabs TTS.
 *
 * Usage: npx tsx generate-narration.ts
 * Requires: ELEVENLABS_API_KEY in .env
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Load .env
const envFile = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
const API_KEY = envFile.match(/ELEVENLABS_API_KEY=(.+)/)?.[1]?.trim();
if (!API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY in .env");
  process.exit(1);
}

const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — warm British storyteller
const OUTPUT_DIR = path.join(__dirname, "audio");

// Narration segments timed to the walkthrough video (~61 seconds)
// Each segment has text and the time offset (seconds) when it should start
// Read actual timestamps from the recording markers
const markersPath = path.join(__dirname, "markers.json");
let markers: Record<string, number> = {};
try {
  markers = JSON.parse(fs.readFileSync(markersPath, "utf8"));
  console.log("Using recorded markers:", markers);
} catch {
  console.warn("No markers.json found — using fallback timings");
  markers = { login: 0, inbox: 6, compose: 14, search: 24, context_menu: 28, calendar: 32, contacts: 42, ai_copilot: 48, dark_mode: 58, shortcuts: 64 };
}

// Narration segments keyed to marker names.
// Each segment starts when its visual action is visible on screen.
const segments = [
  { time: markers.login ?? 0, text: "Meet Massive Mail. A modern webmail client, built for speed." },
  { time: (markers.login ?? 0) + 3, text: "Sign in securely to your account." },
  { time: (markers.inbox ?? 6), text: "A clean three-pane layout. Browse emails with clear read and unread indicators." },
  { time: (markers.compose ?? 14), text: "Compose rich emails with formatting, attachments, and schedule send." },
  { time: (markers.search ?? 24), text: "Find anything instantly with powerful search." },
  { time: (markers.context_menu ?? 28), text: "Right-click for quick actions. Snooze, print, move, and more." },
  { time: (markers.calendar ?? 32), text: "A full calendar with month and week views. Click events or drag to reschedule." },
  { time: (markers.contacts ?? 42), text: "Manage your contacts with photos, groups, and import export." },
  { time: (markers.ai_copilot ?? 48), text: "Ask the AI assistant to summarize, translate, or draft replies." },
  { time: (markers.dark_mode ?? 58), text: "Switch to dark mode with one click. Massive Mail. The inbox you deserve." },
];

async function generateSegment(text: string, index: number): Promise<string> {
  const outPath = path.join(OUTPUT_DIR, `segment-${String(index).padStart(2, "0")}.mp3`);

  console.log(`Generating segment ${index}: "${text.substring(0, 50)}..."`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${err}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`  → ${outPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
  return outPath;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Generate all narration segments
  const segmentFiles: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const file = await generateSegment(segments[i].text, i);
    segmentFiles.push(file);
  }

  // Build ffmpeg filter to position each segment at the right time
  // Create a 62-second silent base track, then overlay each segment
  const totalDuration = 62;

  // Generate silent base
  const silentPath = path.join(OUTPUT_DIR, "silent.mp3");
  execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t ${totalDuration} -c:a libmp3lame -q:a 2 "${silentPath}"`, { stdio: "pipe" });

  // Build complex filter for mixing
  let inputs = `-i "${silentPath}"`;
  let filterParts: string[] = [];
  let currentMix = "[0:a]";

  for (let i = 0; i < segments.length; i++) {
    const delay = segments[i].time * 1000; // ms
    inputs += ` -i "${segmentFiles[i]}"`;
    const inputIdx = i + 1;
    // Delay the segment and mix it with the accumulator
    filterParts.push(`[${inputIdx}:a]adelay=${delay}|${delay}[d${i}]`);
    const prevMix = currentMix;
    currentMix = `[mix${i}]`;
    filterParts.push(`${prevMix}[d${i}]amix=inputs=2:duration=first:normalize=0${currentMix}`);
  }

  const narrationPath = path.join(__dirname, "narration.mp3");
  const filter = filterParts.join("; ");
  const cmd = `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "${currentMix}" -c:a libmp3lame -q:a 2 "${narrationPath}"`;

  console.log("\nMixing narration segments...");
  execSync(cmd, { stdio: "pipe" });
  console.log(`✓ Narration saved to ${narrationPath}`);

  // Mix narration with background music
  const bgMusicPath = path.join(OUTPUT_DIR, "bg-music.mp3");
  const mixedAudioPath = path.join(__dirname, "mixed-audio.mp3");

  if (fs.existsSync(bgMusicPath)) {
    console.log("\nMixing narration with background music...");
    execSync(
      `ffmpeg -y -i "${narrationPath}" -i "${bgMusicPath}" -filter_complex "[0:a]volume=1.0[voice];[1:a]volume=0.4[music];[voice][music]amix=inputs=2:duration=first:normalize=0" -c:a libmp3lame -q:a 2 "${mixedAudioPath}"`,
      { stdio: "pipe" }
    );
    console.log(`✓ Mixed audio saved to ${mixedAudioPath}`);
  } else {
    fs.copyFileSync(narrationPath, mixedAudioPath);
    console.log("No background music found, using narration only");
  }

  // Now mix audio with the video
  const videoPath = path.join(__dirname, "walkthrough.mp4");
  const finalPath = path.join(__dirname, "walkthrough-narrated.mp4");

  console.log("\nMixing audio with video...");
  execSync(
    `ffmpeg -y -i "${videoPath}" -i "${mixedAudioPath}" -c:v copy -c:a aac -b:a 128k -shortest "${finalPath}"`,
    { stdio: "pipe" }
  );
  console.log(`✓ Final video saved to ${finalPath}`);

  // Replace the original
  fs.copyFileSync(finalPath, videoPath);
  console.log(`✓ Updated walkthrough.mp4 with narration`);
}

main().catch(console.error);
