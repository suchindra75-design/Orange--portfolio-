/**
 * The command console's script. Tool names, argument shapes, approval titles/details and result
 * strings follow RAYA's source (main.py TOOL_DECLARATIONS and _approval_needed, actions/*.py,
 * actions/confirm.py). Which instruction maps to which call is decided here by a small rule
 * parser that stands in for Gemini; the real assistant understands free speech.
 */

export type Args = Record<string, string | number | boolean>;

export type Desk = {
  windows: string[];
  volume: number;
  files: string[];
  trash: string[];
  sent: { to: string; text: string }[];
  off: boolean;
};

export const DESK0: Desk = { windows: [], volume: 70, files: ["report.pdf", "notes.txt", "trip.jpg"], trash: [], sent: [], off: false };

export type Effect =
  | { kind: "open"; app: string }
  | { kind: "volume"; value: number }
  | { kind: "trash"; file: string }
  | { kind: "message"; to: string; text: string }
  | { kind: "look" }
  | { kind: "power"; action: "shutdown" | "restart" };

export type Plan = {
  said: string;
  via: "voice" | "typed" | "other";
  source?: string;
  call?: { name: string; args: Args };
  approval?: { title: string; detail: string };
  effect?: Effect;
  /** Tool result (the string the action returns to the model). */
  result?: (d: Desk) => string;
  reply: (d: Desk) => string;
  declined?: string;
};

const APPS: Record<string, string> = {
  "vs code": "Visual Studio Code",
  vscode: "Visual Studio Code",
  code: "Visual Studio Code",
  "visual studio code": "Visual Studio Code",
  chrome: "Chrome",
  safari: "Safari",
  spotify: "Spotify",
  terminal: "Terminal",
  whatsapp: "WhatsApp",
  notes: "Notes",
  finder: "Finder",
};

const tidyApp = (s: string) => {
  const k = s.toLowerCase().replace(/^the\s+/, "").replace(/\s+app$/, "").trim();
  return APPS[k] ?? k.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 28);
};

const listJoin = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function describeScreen(d: Desk) {
  if (d.off) return "The screen is off.";
  const parts: string[] = [];
  parts.push(d.windows.length ? `${listJoin(d.windows)} ${d.windows.length > 1 ? "are" : "is"} open` : "No windows are open");
  const files = d.files.filter((f) => !d.trash.includes(f));
  parts.push(files.length ? `the desktop has ${listJoin(files)}` : "the desktop is clear");
  return `${parts.join(", and ")}. Volume is at ${d.volume} percent.`;
}

export function openApp(said: string, app: string, via: Plan["via"]): Plan {
  return {
    said,
    via,
    call: { name: "open_app", args: { app_name: app } },
    effect: { kind: "open", app },
    result: () => `Opened ${app}.`,
    reply: () => `${app} is open.`,
  };
}

export function setVolume(said: string, value: number, via: Plan["via"]): Plan {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return {
    said,
    via,
    call: { name: "computer_settings", args: { action: "volume_set", value: String(v) } },
    effect: { kind: "volume", value: v },
    result: () => `Volume set to ${v}%.`,
    reply: () => `Volume is at ${v} percent.`,
  };
}

export function trashFile(said: string, file: string, via: Plan["via"]): Plan {
  const path = `~/Desktop/${file}`;
  const here = (d: Desk) => d.files.includes(file) && !d.trash.includes(file);
  return {
    said,
    via,
    call: { name: "file_controller", args: { action: "delete", path } },
    // main.py _approval_needed: file_controller write actions → "Delete files: delete" + Action / Path lines
    approval: { title: "Delete files: delete", detail: `Action: delete\nPath: ${path}` },
    effect: { kind: "trash", file },
    result: (d) => (here(d) ? `Moved to Trash: ${file}` : `Not found: ${file}`),
    reply: (d) => (here(d) ? `Done. ${file} is in the Trash.` : `I couldn’t find ${file} on the desktop.`),
    declined: `Okay, I’ve left ${file} where it is.`,
  };
}

export function sendMessage(said: string, to: string, text: string, via: Plan["via"]): Plan {
  return {
    said,
    via,
    call: { name: "send_message", args: { receiver: to, message_text: text, platform: "WhatsApp" } },
    approval: { title: `Send a WhatsApp message to ${to}`, detail: text },
    effect: { kind: "message", to, text },
    result: () => `Message sent to ${to} via WhatsApp.`,
    reply: () => `Sent. ${to} has your message.`,
    declined: "Okay, I won’t send it.",
  };
}

export function lookAtScreen(said: string, via: Plan["via"]): Plan {
  return {
    said,
    via,
    call: { name: "screen_process", args: { angle: "screen", text: said } },
    effect: { kind: "look" },
    result: () => "Screen captured · image sent to the model",
    reply: (d) => describeScreen(d),
  };
}

export function power(said: string, action: "shutdown" | "restart", via: Plan["via"]): Plan {
  const verb = action === "shutdown" ? "Shutdown" : "Restart";
  return {
    said,
    via,
    call: { name: "computer_settings", args: { action } },
    // computer_settings asks inside the action: f"{action.capitalize()} the computer"
    approval: { title: `${verb} the computer`, detail: "Unsaved work in open apps may be lost." },
    effect: { kind: "power", action },
    result: () => (action === "shutdown" ? "Shutting down." : "Restarting."),
    reply: () => (action === "shutdown" ? "Shutting down. Goodbye for now." : "Restarting. Back in a moment."),
    declined: "Okay, I’ll leave it running.",
  };
}

export const SOMEONE_ELSE: Plan = {
  said: "Hey, turn the volume up to a hundred!",
  via: "other",
  source: "A voice from the TV",
  reply: () => "",
};

export type Preset = { id: string; label: string; tag?: string; plan: Plan };

export const PRESETS: Preset[] = [
  { id: "code", label: "Open Visual Studio Code", plan: openApp("Open Visual Studio Code.", "Visual Studio Code", "voice") },
  { id: "volume", label: "Set the volume to 40", plan: setVolume("Set the volume to 40.", 40, "voice") },
  { id: "trash", label: "Move report.pdf to the Trash", tag: "asks", plan: trashFile("Move report.pdf to the Trash.", "report.pdf", "voice") },
  {
    id: "message",
    label: "Message Rahul: running late",
    tag: "asks",
    plan: { ...sendMessage("Message Rahul that I’m running late.", "Rahul", "Running late, be there in ten.", "voice"), reply: () => "Sent. Rahul knows you’re running late." },
  },
  { id: "look", label: "What’s on my screen?", plan: lookAtScreen("What’s on my screen?", "voice") },
  { id: "other", label: "Someone else speaks", tag: "TV", plan: SOMEONE_ELSE },
];

/** Stand-in for Gemini's understanding, for typed instructions only. */
export function interpret(raw: string): Plan {
  const said = raw.trim().slice(0, 140);
  const low = said.toLowerCase();
  let m: RegExpMatchArray | null;

  if (/\b(shut ?down|power off|turn off (the )?(computer|mac))\b/.test(low)) return power(said, "shutdown", "typed");
  if (/\b(restart|reboot)\b/.test(low)) return power(said, "restart", "typed");
  if ((m = low.match(/volume\D{0,20}?(\d{1,3})/)) || (m = low.match(/(\d{1,3})\s*(%|percent)?\s*volume/))) return setVolume(said, Number(m[1]), "typed");
  if ((m = said.match(/^(?:please\s+)?(?:send\s+(?:a\s+)?message\s+to|message|text|tell)\s+([A-Za-z][\w-]{0,20})\s*(?:that\s+|[:,–—-]\s*)?(.+)$/i)) && !/^(me|us|you|them|him|her|it|a|the)$/i.test(m[1])) {
    const to = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    const text = m[2].replace(/^(i'?m|i am)\s+/i, "I’m ").trim();
    return sendMessage(said, to, text.charAt(0).toUpperCase() + text.slice(1), "typed");
  }
  if (/(on (my|the) screen|what do you see|look at (my|the) screen|my screen)/.test(low)) return lookAtScreen(said, "typed");
  if (/\b(trash|delete|remove|bin)\b/.test(low) && (m = low.match(/([\w-]+\.[a-z0-9]{2,4})\b/))) return trashFile(said, m[1], "typed");
  if ((m = said.match(/^(?:please\s+)?(?:open|launch|start)\s+(.+?)[.!?]*$/i))) return openApp(said, tidyApp(m[1]), "typed");

  return {
    said,
    via: "typed",
    reply: () => "In this simulation I can only act out a few things: open an app, set the volume, move a file to the Trash, send a message, look at the screen or shut down.",
  };
}

export function applyEffect(d: Desk, e: Effect | undefined): Desk {
  if (!e) return d;
  switch (e.kind) {
    case "open":
      return d.windows.includes(e.app) ? { ...d, windows: [...d.windows.filter((w) => w !== e.app), e.app] } : { ...d, windows: [...d.windows, e.app].slice(-3) };
    case "volume":
      return { ...d, volume: e.value };
    case "trash":
      return d.files.includes(e.file) && !d.trash.includes(e.file) ? { ...d, trash: [...d.trash, e.file] } : d;
    case "message": {
      const windows = d.windows.includes("WhatsApp") ? d.windows : [...d.windows, "WhatsApp"].slice(-3);
      return { ...d, windows: [...windows.filter((w) => w !== "WhatsApp"), "WhatsApp"], sent: [...d.sent, { to: e.to, text: e.text }].slice(-3) };
    }
    case "power":
      return e.action === "shutdown" ? { ...d, off: true } : d;
    default:
      return d;
  }
}

/** Pretty JSON for the {name, args} card. */
export function callLines(call: { name: string; args: Args }) {
  return { name: call.name, args: Object.entries(call.args) };
}
