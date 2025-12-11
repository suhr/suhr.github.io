one sig True {}

sig Pitch {}
sig Note { pitch: one Pitch }

fact { all p: Pitch | some (Note <: pitch).p }

sig DgKey {
    var pressed: lone True,  -- external
    var active: lone True,
    note: one Note
}

fact { Note = DgKey.note }

sig MidiKey {
    var pressed: lone True,  -- external
    pitch: one Pitch
}

one sig State {
    var idle: lone True,
    var pedal: lone True,  -- external
    var playing: set Pitch
}

-- Join of DgKey and MidiKey by pitch
fun dg2midi : DgKey -> MidiKey {
    note.pitch.~(MidiKey <: pitch)
}

fact init {
    no DgKey.pressed
    no DgKey.active
    no MidiKey.pressed
    some State.idle
    no State.pedal
    no State.playing
}

pred stutter {
    DgKey <: pressed' = pressed
    active' = active
    MidiKey <: pressed' = pressed
    idle' = idle
    pedal' = pedal
    playing' = playing
}

-- События

pred eventAction {
    some idle and no idle'
    active' = active
    playing' = playing
    (evDgKeyChange or evPedalChange or evMidiKeyChange)
}

pred evDgKeyChange {
    (some k: DgKey |
        not k.pressed = k.pressed' and
        all ok: DgKey | ok = k or ok.pressed' = ok.pressed)
    pedal' = pedal
    MidiKey <: pressed' = pressed
}

pred evPedalChange {
    not pedal = pedal'
    DgKey <: pressed' = pressed
    MidiKey <: pressed' = pressed
}

pred evMidiKeyChange {
    (some mk: MidiKey |
        not mk.pressed = mk.pressed' and
        all ok: MidiKey | ok = mk or ok.pressed' = ok.pressed)
    pedal' = pedal
    DgKey <: pressed' = pressed
}

-- Реакции

pred reactAction {
    no idle and some idle'
    DgKey <: pressed' = pressed
    MidiKey <: pressed' = pressed
    pedal' = pedal
    noPedalReaction or pedalReaction
}

pred noPedalReaction {
    no pedal
    active' = pressed + dg2midi.pressed
    State.playing' = (DgKey <: pressed.True).note.pitch + (MidiKey <: pressed.True).pitch
}

pred pedalReaction {
    some pedal
    active' = active + pressed + dg2midi.pressed
    State.playing' =
        State.playing + (DgKey <: pressed.True).note.pitch + (MidiKey <: pressed.True).pitch
}

fact step {
    always (eventAction or reactAction or stutter)
}

run example {} for 4 but 2..5 Pitch, 5..10 steps

-- Ассерты
check pedalHolds
check activeInPlaying
check dgNotActive
check dgActive
check notPlayingPitch
check playingPitch

-- Педаль удежривает ноты
assert pedalHolds {
    some pedal => playing in playing' and active in active'
}

-- Нажатые клавиши играются
assert activeInPlaying {
    (active.True).note.pitch in State.playing
}

-- Клавиша не нажата, если её никто не нажимает
assert dgNotActive {
    not (
        some State.idle and no State.pedal and
        some k: DgKey |
            some k.active and no k.pressed and
            no mk: MidiKey | some mk.pressed and mk.pitch = k.note.pitch
    )
}

-- Клавиша нажата, если её кто-то нажимает
assert dgActive {
    not (
        some State.idle and
        some k: DgKey |
            no k.active and
            (some k.pressed or
                some mk: MidiKey | some mk.pressed and k.note.pitch = mk.pitch)
    )
}

-- Нота не играется, если ничто не нажато
assert notPlayingPitch {
    not (
        some State.idle and no State.pedal and
        some p: Pitch |
            p in State.playing and
            (no k: DgKey | some k.pressed and k.note.pitch = p) and
            (no mk: MidiKey | some mk.pressed and mk.pitch = p)
    )
}

-- Нота играется, если что-то нажато
assert playingPitch {
    not (
        some State.idle and
        some p: Pitch |
            not p in State.playing and
            (   (some k: DgKey | some k.pressed and k.note.pitch = p) or
                (some mk: MidiKey | some mk.pressed and mk.pitch = p)
            )
    )
}
