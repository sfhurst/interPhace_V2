# interPhace Button Map

**App ID:** `app1`  
**Role:** project shell, shared musical context, mixing, import/export, child settings, and eventual lightweight arrangement.

## Permanent bottom row

Before any button page is opened, direct interPhace loads show the non-button startup splash: a large animated `interPhace` wordmark with no active B1-B5 button. The normal shared top/bottom shell remains present. Contextual returns from a child Phace bypass the splash and open the relevant B5 settings page.

| Button | Current function | Pages / behavior | Status |
|---|---|---|---|
| B1 | Project | `app1_b1_p1` — Project Name, Root, Scale, Tempo, Length, Swing, and Timing controls owned by interPhace | Live |
| B2 | Mixer | `app1_b2_p1` — dynamic ARP/SYNTH, Kick, Snare, Hat, Noise, and Drone dB controls; ARP/SYNTH Playback and Drone/Noise Opposed Orbit; mute skips render work | Live / audition-wired |
| B3 | Import | `app1_b3_p1` — Projects / Patches / MIDI / Kits selection grid | Live |
| B4 | Export | `app1_b4_p1` — Projects / Patches / MIDI / Audio selection grid and export actions | Live |
| B5 | Child Phace Settings | Recycled settings pages for synthPhace, arpPhace, drumPhace, noisePhace, dronePhace | Live |
| B6 | Phace | Opens the six-Phace selector / gateway | Live |

## Agreed B2 extension

B2 will cycle between **Mixer** and a deliberately small **Sequencer**. The Sequencer is not a DAW. It exists to audition the project as a cohesive group and to select which of arpPhace melodies M1–M4 participate by bar while skipping empty material.

## Ownership

interPhace owns project name, Root, Scale, Tempo, project length, global audition, global mix, import/export, and cross-Phace sequencing context. Child Phaces own their sound/pattern data.

## Addressing

Permanent page IDs use `app1_bN_pN`. Recycled shell buttons remain `shellB1` through `shellB6` across all Phaces.

## Build 288 global audition routing

interPhace remains the coordinator, not the sound engine. Hidden child render hosts call the real Drum, Synth/Arp, Noise and Drone engines. Drum and Synth/Arp loop by their existing musical lengths. Noise and Drone each supply an independent 30-second completed bed buffer; the shared bed transport overlaps successive copies by 3 seconds until Global Stop. All active sources share one scheduled start time. Muted channels are not rendered.

## Build 285 bed relationship experiment

Global Play only: Drone and Noise are panned to opposite sides of the same asymmetric orbit. The orbit depth follows the current dronePhace Space Motion value. If Drone Space Motion is zero, the opposed orbit is effectively disabled.

## Build 288 Patch export/import meanings

| Patch option | Authoritative contents |
|---|---|
| Synth | Complete synthPhace sound parameters |
| Drums | All three 8-value drum synths + patterns + Chance/Volume/Repeats + styles |
| Kit | All three 8-value drum synths only |
| Kick | Kick 8-value synth + pattern + Chance/Volume/Repeats + style |
| Snare | Snare 8-value synth + pattern + Chance/Volume/Repeats + style |
| Hat | Hat 8-value synth + pattern + Chance/Volume/Repeats + style |
| Drone | 20 B1–B4 sound values + preset-selector metadata |
| Noise | Current legacy noise state until redesign |
| Arp | A1–A4 macros + arp pattern/custom data |
| Melody | M1–M4 notes + Chance/Volume/Gate grids |

Import uses the same contracts in reverse. Partial drum patches merge only their owned instrument/state; full Drums restores the full drumPhace object.
