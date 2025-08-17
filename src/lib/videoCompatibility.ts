export type VideoCompatibility = {
  playable: boolean;
  details: string;
  detectedVideoCodec?: string | null;
  detectedAudioCodec?: string | null;
  container?: string | null;
};

const TOKEN_LIST = [
  "avc1", // H.264
  "h264",
  "mp4a", // AAC
  "hvc1", // HEVC/H.265
  "hev1", // HEVC/H.265 alt
  "vp09", // VP9
  "av01", // AV1
  "opus",
  "isom",
  "mp42",
  "qt  ",
  "moov",
  "ftyp"
];

function bytesContainsToken(bytes: Uint8Array, token: string): boolean {
  const t = new TextEncoder().encode(token);
  outer: for (let i = 0; i <= bytes.length - t.length; i++) {
    for (let j = 0; j < t.length; j++) {
      if (bytes[i + j] !== t[j]) continue outer;
    }
    return true;
  }
  return false;
}

async function readHeaderBytes(file: File, maxBytes = 512 * 1024): Promise<Uint8Array> {
  const end = Math.min(file.size, maxBytes);
  const slice = file.slice(0, end);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}

export async function analyzeFileCodecs(file: File): Promise<{ videoCodec: string | null; audioCodec: string | null; container: string | null; tokens: Record<string, boolean>; }> {
  const bytes = await readHeaderBytes(file);

  const tokensFound: Record<string, boolean> = {};
  for (const token of TOKEN_LIST) {
    tokensFound[token] = bytesContainsToken(bytes, token);
  }

  const container = tokensFound["qt  "] ? "quicktime" : (tokensFound["isom"] || tokensFound["mp42"] ? "mp4" : null);
  let videoCodec: string | null = null;
  if (tokensFound["avc1"]) videoCodec = "avc1";
  else if (tokensFound["hvc1"]) videoCodec = "hvc1";
  else if (tokensFound["hev1"]) videoCodec = "hev1";
  else if (tokensFound["vp09"]) videoCodec = "vp09";
  else if (tokensFound["av01"]) videoCodec = "av01";

  const audioCodec = tokensFound["mp4a"] ? "mp4a" : (tokensFound["opus"] ? "opus" : null);

  return { videoCodec, audioCodec, container, tokens: tokensFound };
}

export async function isBrowserLikelyToPlay(file: File): Promise<VideoCompatibility> {
  try {
    const { videoCodec, audioCodec, container } = await analyzeFileCodecs(file);
    const videoEl = document.createElement("video");

    const hasH264Support = !!videoEl.canPlayType && videoEl.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"') !== "";
    const hasHEVCSupport = !!videoEl.canPlayType && videoEl.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') !== "";
    const hasVP9Support = !!videoEl.canPlayType && videoEl.canPlayType('video/webm; codecs="vp09, opus"') !== "";
    const hasAV1Support = !!videoEl.canPlayType && videoEl.canPlayType('video/mp4; codecs="av01.0.05M.08, mp4a.40.2"') !== "";

    // Quick accept cases
    if (videoCodec === "avc1" && hasH264Support) {
      return {
        playable: true,
        details: "H.264/AAC likely supported",
        detectedVideoCodec: videoCodec,
        detectedAudioCodec: audioCodec,
        container
      };
    }
    if (videoCodec === "vp09" && hasVP9Support) {
      return {
        playable: true,
        details: "VP9 likely supported",
        detectedVideoCodec: videoCodec,
        detectedAudioCodec: audioCodec,
        container
      };
    }
    if (videoCodec === "av01" && hasAV1Support) {
      return {
        playable: true,
        details: "AV1 likely supported",
        detectedVideoCodec: videoCodec,
        detectedAudioCodec: audioCodec,
        container
      };
    }

    // Common unsupported case: HEVC/H.265 in MP4/MOV on non-Safari browsers
    if ((videoCodec === "hvc1" || videoCodec === "hev1") && !hasHEVCSupport) {
      return {
        playable: false,
        details: "HEVC/H.265 not supported by this browser"
      };
    }

    // Fallback heuristics based on MIME/extension if codecs unknown
    const type = file.type || "";
    if (type.includes("quicktime")) {
      // MOV container; many browsers can play if H.264, but often it's HEVC on iOS recorders
      if (!hasH264Support) {
        return {
          playable: false,
          details: "QuickTime container with unknown codec and no H.264 support"
        };
      }
    }
    if (type.includes("webm")) {
      if (!hasVP9Support) {
        return {
          playable: false,
          details: "WebM detected but VP9/Opus not supported"
        };
      }
      return {
        playable: true,
        details: "WebM likely supported",
        detectedVideoCodec: videoCodec,
        detectedAudioCodec: audioCodec,
        container: container || "webm"
      };
    }

    // Unknowns: allow but warn via details
    return {
      playable: true,
      details: "Unknown codecs; attempting playback",
      detectedVideoCodec: videoCodec,
      detectedAudioCodec: audioCodec,
      container
    };
  } catch (err: any) {
    return {
      playable: true,
      details: `Compatibility check failed: ${err?.message || err}`
    };
  }
}