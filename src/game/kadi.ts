export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'none';
export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'
  | 'Joker';
export type Direction = 'clockwise' | 'counterclockwise';
export type GameMode = 'practice' | 'online';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  cards: Card[];
  drinks: number;
  score: number;
}

export type GameEventType =
  | 'play'
  | 'king'
  | 'jack'
  | 'queen'
  | 'joker'
  | 'ace'
  | 'draw'
  | 'win';

export interface GameEvent {
  type: GameEventType;
  playerId: string;
  card?: Card;
  message: string;
}

export interface GameState {
  id: string;
  mode: GameMode;
  playerCount: number;
  players: Player[];
  drawPile: Card[];
  topCard: Card;
  discardPile: Card[];
  currentPlayerId: string;
  direction: Direction;
  requestedSuit?: Suit;
  question?: string;
  lastEvent?: GameEvent;
  winnerId?: string;
  pointsAwarded: number;
  turnNumber: number;
}

export interface CreateGameOptions {
  playerCount?: number;
  seed?: number;
  mode?: GameMode;
}

export interface PlayCardOptions {
  requestedSuit?: Suit;
  question?: string;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
];

// A seeded generator keeps games reproducible for tests and deterministic bots.
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// The deck intentionally contains physical duplicates with unique IDs.
export function createDeck(): Card[] {
  const cards: Card[] = [];

  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      cards.push({ id: `${suit}-${rank}`, suit, rank });
    });
  });

  cards.push(
    { id: 'joker-1', suit: 'none', rank: 'Joker' },
    { id: 'joker-2', suit: 'none', rank: 'Joker' },
  );

  return cards;
}

function shuffle(cards: Card[], random: () => number): Card[] {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

// Exactly five players are supported by the rules and by the table layout.
export function createGame({
  playerCount = 5,
  seed = Date.now(),
  mode = 'practice',
}: CreateGameOptions = {}): GameState {
  if (playerCount !== 5) {
    throw new Error('Niko Kadi supports exactly five players.');
  }

  const random = createSeededRandom(seed);
  const deck = shuffle(createDeck(), random);
  const players: Player[] = Array.from({ length: playerCount }, (_, index) => ({
    id: `player-${index + 1}`,
    name: index === 0 ? 'You' : `Bot ${index}`,
    isBot: index !== 0,
    cards: deck.slice(index * 4, index * 4 + 4),
    drinks: 0,
    score: 0,
  }));

  const dealtCards = players.flatMap((player) => player.cards);
  const topCard = deck[20];
  const drawPile = deck.slice(21);

  if (!topCard || dealtCards.length !== 20 || drawPile.length !== 33) {
    throw new Error('The deck could not be dealt correctly.');
  }

  return {
    id: `game-${seed}`,
    mode,
    playerCount,
    players,
    drawPile,
    topCard,
    discardPile: [topCard],
    currentPlayerId: players[0].id,
    direction: 'clockwise',
    requestedSuit: undefined,
    question: undefined,
    lastEvent: {
      type: 'play',
      playerId: 'system',
      message: 'The game has started. Your turn.',
    },
    pointsAwarded: 0,
    turnNumber: 1,
  };
}

function getPlayerIndex(game: GameState, playerId: string): number {
  const index = game.players.findIndex((player) => player.id === playerId);

  if (index === -1) {
    throw new Error('Player not found.');
  }

  return index;
}

function getNextPlayerIndex(
  game: GameState,
  steps = 1,
  direction = game.direction,
): number {
  const currentIndex = getPlayerIndex(game, game.currentPlayerId);
  const step = direction === 'clockwise' ? 1 : -1;
  return (currentIndex + step * steps + game.players.length) % game.players.length;
}

function cardMatches(card: Card, topCard: Card, requestedSuit?: Suit): boolean {
  if (card.rank === 'Joker') {
    return true;
  }

  if (requestedSuit) {
    return card.suit === requestedSuit;
  }

  return card.rank === topCard.rank || card.suit === topCard.suit;
}

export function getLegalCards(game: GameState, playerId: string): Card[] {
  const player = game.players.find((candidate) => candidate.id === playerId);

  if (!player) {
    return [];
  }

  return player.cards.filter((card) =>
    cardMatches(card, game.topCard, game.requestedSuit),
  );
}

function createPlayEvent(
  player: Player,
  card: Card,
  type: GameEventType,
  message: string,
): GameEvent {
  return {
    type,
    playerId: player.id,
    card,
    message,
  };
}

// The player may only discard a card currently in their hand and legal against the stack.
export function playCard(
  game: GameState,
  playerId: string,
  card: Card,
  options: PlayCardOptions = {},
): GameState {
  const player = game.players.find((candidate) => candidate.id === playerId);

  if (!player) {
    throw new Error('Player not found.');
  }

  if (game.currentPlayerId !== playerId) {
    throw new Error('It is not that player’s turn.');
  }

  if (!player.cards.some((candidate) => candidate.id === card.id)) {
    throw new Error('That card is not in the player’s hand.');
  }

  if (!cardMatches(card, game.topCard, game.requestedSuit)) {
    throw new Error('That card cannot be played.');
  }

  const players = game.players.map((candidate) =>
    candidate.id === playerId
      ? { ...candidate, cards: candidate.cards.filter((item) => item.id !== card.id) }
      : candidate,
  );
  const updatedPlayer = players.find((candidate) => candidate.id === playerId)!;
  const discardPile = [...game.discardPile, card];
  const turnNumber = game.turnNumber + 1;
  const direction = game.direction;
  let nextDirection = direction;
  let nextPlayerIndex = getNextPlayerIndex(game);
  let requestedSuit: Suit | undefined;
  let question: string | undefined;
  let eventType: GameEventType = 'play';
  let message = `${player.name} played ${card.rank}${card.suit !== 'none' ? ` of ${card.suit}` : ''}.`;
  const pointsAwarded = 0;

  if (card.rank === 'K') {
    eventType = 'king';
    nextDirection = direction === 'clockwise' ? 'counterclockwise' : 'clockwise';
    nextPlayerIndex = getNextPlayerIndex(game, 1, nextDirection);
    message = `${player.name} kicked the table backward.`;
  } else if (card.rank === 'J') {
    eventType = 'jack';
    nextPlayerIndex = getNextPlayerIndex(game, 2);
    message = `${player.name} jumped the next player.`;
  } else if (card.rank === 'Q' || card.rank === '8') {
    eventType = 'queen';
    question = options.question ?? `${player.name} asks the next player a question.`;
    message = `${player.name} asked a question.`;
  } else if (card.rank === 'Joker') {
    eventType = 'joker';
    updatedPlayer.drinks += 1;
    message = `${player.name} created a drink card.`;
  } else if (card.rank === 'A') {
    eventType = 'ace';
    requestedSuit = options.requestedSuit;

    if (!requestedSuit) {
      throw new Error('An Ace requires a requested suit.');
    }

    message = `${player.name} requested ${requestedSuit}.`;
  } else if (card.rank === '2' || card.rank === '3') {
    message = `${player.name} played a ${card.rank} and added its turn effect.`;
  }

  const winner = updatedPlayer.cards.length === 0 ? player.id : undefined;
  const currentPlayerId = winner
    ? player.id
    : game.players[nextPlayerIndex].id;
  const nextPlayers = players.map((candidate) =>
    candidate.id === player.id && winner
      ? { ...candidate, score: candidate.score + (game.mode === 'online' ? 3 : 0) }
      : candidate,
  );

  const nextGame: GameState = {
    ...game,
    players: nextPlayers,
    drawPile: game.drawPile,
    topCard: card,
    discardPile,
    currentPlayerId,
    direction: nextDirection,
    requestedSuit: card.rank === 'A' ? requestedSuit : undefined,
    question: card.rank === 'Q' || card.rank === '8' ? question : undefined,
    lastEvent: createPlayEvent(player, card, eventType, message),
    winnerId: winner,
    pointsAwarded,
    turnNumber,
  };

  if (winner) {
    nextGame.lastEvent = {
      type: 'win',
      playerId: winner,
      card,
      message: `${player.name} won the round!`,
    };
  }

  return nextGame;
}

export function answerQuestion(game: GameState): GameState {
  if (!game.question) {
    throw new Error('There is no question to answer.');
  }

  return {
    ...game,
    question: undefined,
    lastEvent: {
      type: 'play',
      playerId: game.currentPlayerId,
      message: 'The question was answered. Play continues.',
    },
  };
}

// Draws one card only when the player has no legal play. The caller can then decide
// whether to play the drawn card immediately or pass the turn.
export function drawCard(game: GameState, playerId: string): GameState {
  const player = game.players.find((candidate) => candidate.id === playerId);

  if (!player || game.currentPlayerId !== playerId) {
    throw new Error('That player cannot draw right now.');
  }

  if (getLegalCards(game, playerId).length > 0) {
    throw new Error('This player has a legal card to play.');
  }

  const drawnCard = game.drawPile[0];

  if (!drawnCard) {
    throw new Error('The draw pile is empty.');
  }

  const players = game.players.map((candidate) =>
    candidate.id === playerId
      ? {
          ...candidate,
          cards: [...candidate.cards, drawnCard],
        }
      : candidate,
  );
  const nextPlayerIndex = getNextPlayerIndex(game);

  return {
    ...game,
    players,
    drawPile: game.drawPile.slice(1),
    currentPlayerId: game.players[nextPlayerIndex].id,
    lastEvent: {
      type: 'draw',
      playerId,
      card: drawnCard,
      message: `${player.name} drew a card.`,
    },
    turnNumber: game.turnNumber + 1,
  };
}

export function getPlayerById(game: GameState, playerId: string): Player | undefined {
  return game.players.find((player) => player.id === playerId);
}

export function getCardValue(card: Card): number {
  if (card.rank === 'Joker') return 0;
  if (card.rank === 'A') return 14;
  if (card.rank === 'K') return 13;
  if (card.rank === 'Q') return 12;
  if (card.rank === 'J') return 11;
  return Number(card.rank);
}

export function getRankLabel(card: Card): string {
  return card.rank === 'Joker' ? 'Joker' : `${card.rank} of ${card.suit}`;
}

export function getPlayableCardCount(game: GameState, playerId: string): number {
  return getLegalCards(game, playerId).length;
}

export function getDirectionLabel(direction: Direction): string {
  return direction === 'clockwise' ? 'Clockwise' : 'Counterclockwise';
}

export function getSuitLabel(suit: Suit): string {
  return suit === 'none' ? 'Any suit' : suit;
}

export function isValidPlayerCount(playerCount: number): boolean {
  return playerCount === 5;
}

export function getAvailableSuits(): Suit[] {
  return [...SUITS];
}
