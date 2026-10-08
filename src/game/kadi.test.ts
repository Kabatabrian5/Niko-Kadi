import { describe, expect, it } from 'vitest';
import {
  createDeck,
  answerQuestion,
  createGame,
  drawCard,
  getLegalCards,
  playCard,
  type Card,
} from './kadi';

// These tests exercise the real game engine. They do not mock cards or UI state.
describe('Niko Kadi game engine', () => {
  it('creates a complete deck with unique card identities', () => {
    const deck = createDeck();

    expect(deck).toHaveLength(54);
    expect(new Set(deck.map((card) => card.id)).size).toBe(54);
    expect(deck.filter((card) => card.rank === 'Joker')).toHaveLength(2);
  });

  it('deals four cards to each of five players', () => {
    const game = createGame({ playerCount: 5, seed: 42 });

    expect(game.players).toHaveLength(5);
    expect(game.players.every((player) => player.cards.length === 4)).toBe(true);
    expect(game.drawPile).toHaveLength(33);
    expect(game.topCard).toBeDefined();
  });

  it('allows matching rank and suit cards', () => {
    const game = createGame({ playerCount: 5, seed: 7 });
    const player = game.players[0];
    const matchingRank = { ...player.cards[0], rank: game.topCard!.rank } as Card;
    const matchingSuit = { ...player.cards[1], suit: game.topCard!.suit } as Card;
    const controlledGame = {
      ...game,
      players: game.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, cards: [matchingRank, matchingSuit, ...candidate.cards] }
          : candidate,
      ),
    };

    expect(getLegalCards(controlledGame, player.id)).toEqual(
      expect.arrayContaining([matchingRank, matchingSuit]),
    );
  });

  it('applies the King reversal effect', () => {
    const game = createGame({ playerCount: 5, seed: 11 });
    const player = game.players[0];
    const king = {
      ...player.cards[0],
      id: 'test-king',
      rank: 'K',
      suit: game.topCard!.suit,
    } as Card;
    const controlledGame = {
      ...game,
      players: game.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, cards: [king, ...candidate.cards] }
          : candidate,
      ),
    };

    const result = playCard(controlledGame, player.id, king);

    expect(result.direction).toBe('counterclockwise');
    expect(result.currentPlayerId).toBe(game.players[4].id);
    expect(result.lastEvent?.type).toBe('king');
    expect(result.players[0].cards).toHaveLength(4);
  });

  it('applies the Jack jump effect', () => {
    const game = createGame({ playerCount: 5, seed: 13 });
    const player = game.players[0];
    const jack = {
      ...player.cards[0],
      id: 'test-jack',
      rank: 'J',
      suit: game.topCard!.suit,
    } as Card;
    const controlledGame = {
      ...game,
      players: game.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, cards: [jack, ...candidate.cards] }
          : candidate,
      ),
    };

    const result = playCard(controlledGame, player.id, jack);

    expect(result.currentPlayerId).toBe(game.players[2].id);
    expect(result.lastEvent?.type).toBe('jack');
  });

  it('applies the Queen question effect', () => {
    const game = createGame({ playerCount: 5, seed: 17 });
    const player = game.players[0];
    const queen = {
      ...player.cards[0],
      id: 'test-queen',
      rank: 'Q',
      suit: game.topCard!.suit,
    } as Card;
    const controlledGame = {
      ...game,
      players: game.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, cards: [queen, ...candidate.cards] }
          : candidate,
      ),
    };

    const result = playCard(controlledGame, player.id, queen);

    expect(result.question).toBeTruthy();
    expect(result.lastEvent?.type).toBe('queen');
  });

  it('applies the Joker drink effect', () => {
    const game = createGame({ playerCount: 5, seed: 19 });
    const player = game.players[0];
    const joker = {
      ...player.cards[0],
      id: 'test-joker',
      rank: 'Joker',
      suit: 'none',
    } as Card;
    const controlledGame = {
      ...game,
      players: game.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, cards: [joker, ...candidate.cards] }
          : candidate,
      ),
    };

    const result = playCard(controlledGame, player.id, joker);

    expect(result.lastEvent?.type).toBe('joker');
    expect(result.players[0].drinks).toBe(1);
  });

  it('clears a resolved question', () => {
    const game = createGame({ playerCount: 5, seed: 17 });
    const player = game.players[0];
    const queen = {
      ...player.cards[0],
      id: 'test-queen',
      rank: 'Q',
      suit: game.topCard!.suit,
    } as Card;
    const controlledGame = {
      ...game,
      players: game.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, cards: [queen, ...candidate.cards] }
          : candidate,
      ),
    };
    const answeredGame = answerQuestion(playCard(controlledGame, player.id, queen));

    expect(answeredGame.question).toBeUndefined();
    expect(answeredGame.lastEvent?.type).toBe('play');
  });
  it('draws only when the player has no legal card', () => {
    const game = createGame({ playerCount: 5, seed: 23, mode: 'practice' });
    const player = game.players[0];
    const illegalCard = {
      ...player.cards[0],
      id: 'illegal-card',
      rank: '2',
      suit: 'none',
    } as Card;
    const controlledGame = {
      ...game,
      players: game.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, cards: [illegalCard] }
          : candidate,
      ),
      topCard: { ...game.topCard, rank: 'A' as const, suit: 'hearts' as const },
    };
    const draw = controlledGame.drawPile[0];
    const drawnGame = drawCard(controlledGame, player.id);

    expect(drawnGame.players[0].cards).toHaveLength(2);
    expect(drawnGame.drawPile).toHaveLength(controlledGame.drawPile.length - 1);
    expect(drawnGame.currentPlayerId).toBe(game.players[1].id);
    expect(drawnGame.lastEvent?.card?.id).toBe(draw.id);
  });
  it('awards no points for offline practice', () => {
    const game = createGame({ playerCount: 5, seed: 23, mode: 'practice' });
    const player = game.players[0];
    const legalCard = {
      ...player.cards[0],
      id: 'practice-card',
      rank: game.topCard!.rank,
      suit: game.topCard!.suit,
    } as Card;
    const controlledGame = {
      ...game,
      players: game.players.map((candidate) =>
        candidate.id === player.id
          ? { ...candidate, cards: [legalCard, ...candidate.cards] }
          : candidate,
      ),
    };
    const result = playCard(controlledGame, player.id, legalCard);

    expect(result.pointsAwarded).toBe(0);
    expect(result.mode).toBe('practice');
  });

  it('does not allow an illegal card to be played', () => {
    const game = createGame({ playerCount: 5, seed: 29 });
    const player = game.players[0];
    const illegalCard = player.cards.find(
      (card) => card.rank !== game.topCard?.rank && card.suit !== game.topCard?.suit,
    ) as Card;

    expect(getLegalCards(game, player.id)).not.toContain(illegalCard);
    expect(() => playCard(game, player.id, illegalCard)).toThrow(
      'That card cannot be played.',
    );
  });
});
