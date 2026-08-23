//

// Engines for each instrument, style, and resolution
// prettier-ignore
const engines = {
  kick: {
    lofi: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        1,0,0,0, 0,0.5,0,0,
        // Lofi almost always starts with a kick on 1
        // No syncopation, no chatter

        // ---- Beat 2 (steps 8–15) ----
        0.5,0,0.5,0, 0.5,0,0.5,0,
        // Lofi rarely places a kick on beat 2

        // ---- Beat 3 (steps 16–23) ----
        0.5,0,0.5,0, 0,0.5,0,0,
        // Beat 3 is the “optional” lofi kick
        // 1.5 = could be full, ghost, or blank → perfect for lofi looseness

        // ---- Beat 4 (steps 24–31) ----
        0.5,0,0,0.5, 0,0,0,0.5
        // Lofi almost never hits on 4
      ],
      
    },
    boom: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        1, 0.5, 1.5, 0.5,   // 0–3: strong 1, syncopation on the "e"
        0.5, 0, 0, 0, // 4–7: classic boom-bap 16th-note kick grid

        // ---- Beat 2 (steps 8–15) ----
        0, 0, 1.5, 0.5,   // 8–11: avoid kick on 9 (step 8), syncopation after
        0, 0, 0, 0, // 12–15: busy but pocketed

        // ---- Beat 3 (steps 16–23) ----
        1, 0.5, 1.5, 0.5,   // 16–19: strong kick on beat 3
        0.5, 0, 0, 0, // 20–23: syncopation grid

        // ---- Beat 4 (steps 24–31) ----
        0, 0, 1.5, 0.5,   // 24–27: avoid kick on 25 (step 24)
        0, 0, 0, 0  // 28–31: end-of-bar syncopation
      ],
      
    },
    dilla: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        1, 0.5, 1.5, 0.5,   // 0–3: strong 1, but everything after is loose
        0.5, 0.5, 1.5, 0.5, // 4–7: Dilla’s “drunken” early-bar kicks

        // ---- Beat 2 (steps 8–15) ----
        0.5, 0.5, 1.5, 0.5,   // 8–11: often NO kick on 9, but lots of ghost options
        0.5, 1.5, 0.5, 1.5, // 12–15: Dilla’s mid-bar swing zone

        // ---- Beat 3 (steps 16–23) ----
        1, 0.5, 1.5, 0.5,     // 16–19: displaced kicks, sometimes doubled
        0.5, 1.5, 0.5, 1.5, // 20–23: ghost-heavy lead-in

        // ---- Beat 4 (steps 24–31) ----
        0.5, 0.5, 1.5, 0.5, // 24–27: Dilla often avoids a strong 4
        1.5, 0.5, 1, 0.5    // 28–31: late-bar anchor kick
      ],
      
    },
    romil: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        1, 0, 0, 0,      // 0–3: strong downbeat
        0.5, 0, 0, 0,    // 4–7: ghost-only pickup after the upbeat (NEVER a full kick)

        // ---- Beat 2 (steps 8–15) ----
        0, 0, 1, 0,      // 8–11: real syncopated kick on step 10
        0, 0, 0.5, 0,      // 12–15: leave space (Romil does this a lot)

        // ---- Beat 3 (steps 16–23) ----
        1, 0, 0, 0,    // 16–19: ghost-only early pickup (never a full kick)
        0.5, 0, 0, 0,      // 20–23: real upbeat kick on step 20

        // ---- Beat 4 (steps 24–31) ----
        0, 0, 1, 0,      // 24–27: real late-bar kick on step 26
        0, 0, 0.5, 0       // 28–31: clean tail
      ],
      
    },
    dre: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        1, 0, 0, 0,      // 0–3: strong downbeat
        0, 0, 0, 0,      // 4–7: upbeat 8th on step 4 (classic bounce)

        // ---- Beat 2 (steps 8–15) ----
        0, 0, 1.5, 0,      // 8–11: mid‑bar kick on the “&” of 2 (step 10)
        0, 0, 0, 0,      // 12–15: leave space for snare + bass

        // ---- Beat 3 (steps 16–23) ----
        1, 0, 0, 0,      // 16–19: downbeat of beat 3
        1, 0, 0, 0,      // 20–23: upbeat 8th on step 20

        // ---- Beat 4 (steps 24–31) ----
        0, 0, 1.5, 0,      // 24–27: syncopated kick on step 26
        0, 0, 0, 0       // 28–31: clean tail
      ],
      
    },
  },

  snare: {
    lofi: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        0,0,0,0, 0,0,0,0, 
        // Lofi NEVER hits on beat 1, no ghosts either

        // ---- Beat 2 (steps 8–15) ----
        1,0,0,0, 0,0,0,0,
        // Strong backbeat on 8, no chatter before or after

        // ---- Beat 3 (steps 16–23) ----
        0,0,0,0, 0,0,0,0,
        // Lofi NEVER hits on beat 3

        // ---- Beat 4 (steps 24–31) ----
        1,0,0,0, 0,0,0,0
        // Strong backbeat on 24, no chatter
      ],
      
    },
    boom: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        0, 0, 0.5, 0.5,     // 0–3: NEVER ghost here (between kicks)
        0, 0, 0.5, 0.5, // 4–7: lead-in ghosts into snare on 8

        // ---- Beat 2 (steps 8–15) ----
        1, 0.5, 0.5, 1.5,   // 8–11: snare on 8, optional ghost after
        0, 0, 0.5, 0.5,     // 12–15: usually blank

        // ---- Beat 3 (steps 16–23) ----
        0, 0, 0.5, 0.5,     // 16–19: no ghosts here
        0, 0, 0.5, 0.5, // 20–23: lead-in ghosts into snare on 24

        // ---- Beat 4 (steps 24–31) ----
        1, 0.5, 0.5, 1.5,   // 24–27: snare on 24, optional ghost after
        0, 0, 0.5, 0.5      // 28–31: usually blank
      ],
      
    },
    dilla: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        0, 0.5, 0.5, 0.5,   // 0–3: Dilla allows early ghosts (lazy, dragged feel)
        0.5, 0.5, 0.5, 0.5, // 4–7: more ghost chatter leading into 8

        // ---- Beat 2 (steps 8–15) ----
        1, 1.5, 0.5, 0.5,   // 8–11: snare on 8, but often LATE → ghost cluster after
        0.5, 0.5, 0.5, 0.5,   // 12–15: Dilla sometimes doubles the backbeat feel

        // ---- Beat 3 (steps 16–23) ----
        0, 0.5, 0.5, 0.5,   // 16–19: ghosty lead-in to 24
        0.5, 0.5, 0.5, 0.5, // 20–23: heavy ghost zone before snare on 24

        // ---- Beat 4 (steps 24–31) ----
        1, 0.5, 1.5, 0.5,   // 24–27: snare on 24, again often LATE
        0.5, 0.5, 1.5, 0.5    // 28–31: Dilla sometimes drags into the next bar
      ],
      
    },
    romil: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        0, 0, 0, 0,      // 0–3: no early snares
        0.5, 0, 0, 0,      // 4–7: snare on beat 2 (clean, modern)

        // ---- Beat 2 (steps 8–15) ----
        1, 1.5, 0, 0,      // 8–11: space for melodic kicks
        0, 0, 0, 0,      // 12–15: snare on beat 4

        // ---- Beat 3 (steps 16–23) ----
        0, 0, 0, 0,      // 16–19: repeat structure for consistency
        0.5, 0, 0, 0,      // 20–23: snare on beat 2 (bar 2 feel)

        // ---- Beat 4 (steps 24–31) ----
        1, 1.5, 0, 0,      // 24–27: space before final snare
        0, 0, 1, 0     // 28–31: ghost → flam → snare on beat 4
      ],
      
    },
    dre: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        0, 0, 0, 0,      // 0–3: no early snare
        0, 0, 0, 0,      // 4–7: snare on beat 2 (tight, bright)

        // ---- Beat 2 (steps 8–15) ----
        1, 0.5, 0, 0,      // 8–11: clean pocket
        0, 0, 0, 0,      // 12–15: snare on beat 4

        // ---- Beat 3 (steps 16–23) ----
        0, 0, 0, 0,      // 16–19: repeat structure
        0, 0, 0, 0,      // 20–23: snare on beat 2 (bar 2 feel)

        // ---- Beat 4 (steps 24–31) ----
        1, 0.5, 0, 0,      // 24–27: no ghosting (West Coast stays clean)
        0, 0, 0, 0       // 28–31: snare on beat 4, no flam
      ],
      
    },
  },
  hat: {
    lofi: {
      32: [
        // 8th-note lazy hats: hits on 0,4,8,12,16,20,24,28
        0.5,0,0.5,0, 0.5,0,0.5,0,
        0.5,0,0.5,0, 0.5,0,0.5,0,
        0.5,0,0.5,0, 0.5,0,0.5,0,
        0.5,0,0.5,0, 0.5,0,0.5,0
      ],
      
    },
    boom: {
      32: [
        // 16th-note hats: hits on every even step (0,2,4,...,30)
        1,0, 1,0, 1,0, 1,0,
        1,0, 1,0, 1,0, 1,0,
        1,0, 1,0, 1,0, 1,0,
        1,0, 1,0, 1,0, 1,0
      ],
      
    },
    dilla: {
      32: [
        // 16th hats with 32nd ghost flavor:
        // full on evens, ghost-eligible on odds → drunken, busy, but still gridded
        1,0.5, 1,0.5, 1,0.5, 1,0.5,
        1,0.5, 1,0.5, 1,0.5, 1,0.5,
        1,0.5, 1,0.5, 1,0.5, 1,0.5,
        1,0.5, 1,0.5, 1,0.5, 1,0.5
      ],
      
    },
    romil: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        1, 0.5, 1.5, 0.5,    // 0–3: clean 16ths w/ ghost option
        1, 0.5, 1.5, 0.5,    // 4–7: modern roll potential

        // ---- Beat 2 (steps 8–15) ----
        1, 0.5, 1.5, 0.5,    // 8–11: consistent but not rigid
        1, 0.5, 1.5, 0.5,    // 12–15: tasteful 32nd ghost

        // ---- Beat 3 (steps 16–23) ----
        1, 0.5, 1.5, 0.5,    // 16–19: repeat the groove
        1, 0.5, 1.5, 0.5,    // 20–23: subtle variation

        // ---- Beat 4 (steps 24–31) ----
        1, 0.5, 1.5, 0.5,    // 24–27: keep the modern feel
        1, 0.5, 1.5, 0.5     // 28–31: final ghost option
      ],
      
    },
    dre: {
      32: [
        // ---- Beat 1 (steps 0–7) ----
        1, 0, 1, 0,      // 0–3: straight 16ths, no ghosts
        1, 0, 1, 0,      // 4–7: classic Dre-style tight hats

        // ---- Beat 2 (steps 8–15) ----
        1, 0, 1, 0,      // 8–11: keep it clean
        1, 0, 1, 0,      // 12–15: no rolls, no stutters

        // ---- Beat 3 (steps 16–23) ----
        1, 0, 1, 0,      // 16–19: repeat the groove
        1, 0, 1, 0,      // 20–23: consistent 16ths

        // ---- Beat 4 (steps 24–31) ----
        1, 0, 1, 0,      // 24–27: keep the pocket tight
        1, 0, 1, 0       // 28–31: no ghosting, no variation
      ],
      
    },
  },
}
