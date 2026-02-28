one sig True {}

abstract sig Side {}
one sig Left extends Side {}
one sig Right extends Side {}

abstract sig Key { var hover: lone True, var down: lone True }
sig OrdKey extends Key { val: Int, side: Side }
sig AltKey extends Key { valSel: Side -> one Int }

-- Mouse always points to one of keys
-- Mouse can enter CoF or leave it
one sig Mouse {
    var key: Key,
    var inside: lone True,
    var down: lone True
}

one sig Sign { var key: lone Int, var fix: lone True }

abstract sig Tran {}
one sig Change extends Tran {}
one sig Release extends Tran {}

one sig State {
    var idle: lone True,
    var side: Side,
    var tran: lone Tran,
}

pred stutter {
    hover' = hover
    Key <: down' = down
    Mouse <: key' = key
    inside' = inside
    Mouse <: down' = down
    Sign <: key' = key
    fix' = fix
    idle' = idle
    State <: side' = side
    tran' = tran
}

pred event {
    some idle and no idle'
    msEnter or msLeave or msDown or msUp or msMove
}

pred msEnter {
    no inside and some inside'
    Mouse.key' = Mouse.key
    Mouse.down' = Mouse.down
}
pred msLeave {
    some inside and no inside'
    Mouse.key' = Mouse.key
    Mouse.down' = Mouse.down
}
pred msDown {
    some inside
    no Mouse.down and some Mouse.down'
    Mouse.inside' = Mouse.inside
    Mouse.key' = Mouse.key
}
pred msUp {
    some Mouse.down and no Mouse.down'
    inside' = inside
    Mouse.key' = Mouse.key
}
pred msMove {
    Mouse.key' != Mouse.key
    inside' = inside
    Mouse.down' = Mouse.down
}

pred reaction {
    no idle and some idle'
    Mouse.key' = Mouse.key
    Mouse.inside' = Mouse.inside
    Mouse.down' = Mouse.down
    (
        rctEnterTmp or rctLeaveTmp or rctHover or
        rctPressFix or rctMoveChange or rctUpChange or rctPressChange or
        rctPressRelease or rctMoveRelease or rctUpRelease
    )
}

pred keySide[mk: Key, s: Side] {
    (mk in OrdKey and s = mk.side) or (mk in AltKey and s = State.side)
}

pred keyVal[mk: Key, v: Int] {
    (mk in OrdKey and v = mk.val) or (mk in AltKey and v = mk.valSel.(State.side))
}

pred setMouseHover {
    (
        some inside and
        some Mouse.key.hover' and
        (all k: Key | k = Mouse.key or no k.hover')
    ) or (
        no inside and no hover'
    )
}

pred rctEnterTmp {
    some inside
    no Mouse.down
    no Key.down

    Key.down' = Key.down
    setMouseHover
    no Sign.fix'
    keyVal[Mouse.key, Sign.key']
    keySide[Mouse.key, State.side']
    State.tran' = State.tran
}

pred rctLeaveTmp {
    no inside
    no Mouse.down
    no Key.down

    setMouseHover
    Key.down' = Key.down
    no Sign.key'
    no Sign.fix'
    State.side' = State.side
    State.tran' = State.tran
}

pred rctHover {
    no Mouse.down
    some Key.down

    setMouseHover
    Key.down' = Key.down
    Sign.fix' = Sign.fix
    Sign.key' = Sign.key
    State.side' = State.side
    State.tran' = State.tran
}

-- CHANGES: Key <: down, Key <: hover, Sign.fix, Sign.key, State.side
pred setSignWithMouse {
    some Mouse.key.down'
    (all k: Key | k = Mouse.key or no k.down')
    setMouseHover
    some Sign.fix'
    keyVal[Mouse.key, Sign.key']
    keySide[Mouse.key, State.side']
}

pred rctPressFix {
    some inside
    some Mouse.down
    no Key.down

    setSignWithMouse
    State.tran' in Change
}

pred rctMoveChange {
    some Mouse.down
    State.tran in Change

    setSignWithMouse
    State.tran' in Change
}

pred rctUpChange {
    no Mouse.down
    State.tran in Change

    setSignWithMouse
    no State.tran'
}

pred rctPressChange {
    some Mouse.down
    some Key.down
    no Mouse.key.down
    no State.tran

    setSignWithMouse
    State.tran' in Change
}

pred rctPressRelease {
    some Mouse.down
    some Mouse.key.down
    no State.tran

    setSignWithMouse
    State.tran' in Release
}

pred rctMoveRelease {
    some Mouse.down
    no Mouse.key.down or no Mouse.inside
    State.tran in Release

    setSignWithMouse
    State.tran' in Change
}

pred rctUpRelease {
    no Mouse.down
    State.tran in Release
    some Mouse.inside

    no Key.down'
    some Mouse.key.hover'
    (all k: Key | k = Mouse.key or no k.hover')
    no Sign.fix'
    keyVal[Mouse.key, Sign.key']
    keySide[Mouse.key, State.side']
    no State.tran'
}

fact step {
    always (event or reaction or stutter)
}

-- Инварианты:
-- lone Key.down
-- lone Key.hover
-- Sign.key = (Key <: down).True.val
