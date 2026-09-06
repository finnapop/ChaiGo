export async function getAudioDuration(audioBuffer) {
  // MP3 duration will be calculated without music-metadata.
  // LINE requires duration in milliseconds.
  // Use a safe fixed value for the audio message.
  const durationMs = 1000;

  console.log("Audio duration:", durationMs, "ms");

  return durationMs;
}
