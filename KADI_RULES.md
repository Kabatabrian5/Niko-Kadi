# Niko Kadi Rules

## Purpose

Niko Kadi is a five-player, local-first card game played with a 54-card deck. The game engine owns every rule and card effect; the interface only displays game state and collects player actions.

## Deck

The deck contains:

- Four suits: hearts, diamonds, clubs, and spades.
- Rank values: 2 through 10, Jack, Queen, King, and Ace.
- Two Jokers.
- Total: $4 \times 13 + 2 = 54$ cards.

Each physical card is represented by a unique card ID so duplicates such as two 5s remain distinguishable during animation and game history.

## Players

- Exactly five players are supported.
- One player is the human player.
- Up to four players are computer-controlled bots.
- Online rooms may use the same engine after their network transport is added.
- Offline practice never changes leaderboard points.

## Setup

1. Shuffle the complete deck.
2. Deal four cards to each player.
3. Reveal the next card as the top card.
4. Keep the remaining cards in the draw pile.
5. The player with the lowest active card value begins, unless the table rules specify otherwise.
6. The first player may play any card that is legal against the current stack.

## Legal Play

A card may be played when it matches the current play rule:

- Matching rank: the card rank is equal to the current stack rank.
- Matching suit: the card suit is equal to the current stack suit.
- Joker: a Joker is always legal when no other card is playable.
- Ace: an Ace may be played as a suit request or as a matching rank.

A card that is not legal is returned to the player's hand and cannot be played during that turn.

## Stack Rules

### Matching Numbers

A player may play a card with the same number as the current stack. This creates a matching number stack.

### Two and Three

A 2 or 3 may be played on the matching number stack and creates the next matching-number layer. The active player receives the number shown by the card and follows its turn effect.

### Joker

A Joker creates a drink card. The player must announce the drink effect before the next player responds. The effect is recorded in game history.

### Jack

A Jack is a jump card. It skips the next player and gives the turn to the player after that player.

### King

A King is a kickback card. It reverses the direction of play and gives the turn to the player who would have played next.

### Queen and Eight

A Queen or Eight is a question card. The player asks one question of the next player. The next player must answer before play continues.

### Ace

An Ace is a suit-request card. The player chooses a suit and discards the Ace. The next player must either match the requested suit or use another legal card.

## Turn Direction

Play moves clockwise by default. A King reverses direction. An Ace may also change the current suit without changing direction.

## Draw

If a player has no legal card, the player draws one card from the pile. If the drawn card is legal, the player may play it immediately. Otherwise, the turn passes to the next player.

## Winning

A player wins when their hand is empty after a legal discard. The winner receives three leaderboard points in online play. Offline practice awards zero points.

## Game State

The engine stores the current turn, direction, top stack, draw pile, hands, discard history, current question, requested suit, and winner. All state changes must be immutable from the UI's perspective.

## Validation

The engine tests must cover deck size, unique card IDs, legal and illegal plays, rank and suit matching, every special-card effect, draw behavior, direction reversal, win detection, and offline practice point behavior.
