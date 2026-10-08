import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  CircleHelp,
  Crown,
  Hand,
  MessageCircleQuestion,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import {
  answerQuestion,
  createGame,
  drawCard,
  getLegalCards,
  playCard,
  type Card,
  type GameState,
  type Suit,
} from '../game/kadi';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const CARD_LABELS: Record<Card['rank'], string> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
  Joker: 'JOKER',
};

function CardFace({
  card,
  playable = false,
  compact = false,
  onPlay,
}: {
  card: Card;
  playable?: boolean;
  compact?: boolean;
  onPlay?: (card: Card) => void;
}) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const symbol = card.rank === 'Joker' ? '✦' : card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠';

  return (
    <button
      className={`card-face ${playable ? 'is-playable' : ''} ${compact ? 'is-compact' : ''}`}
      type="button"
      aria-label={`${CARD_LABELS[card.rank]} of ${card.suit === 'none' ? 'Joker' : card.suit}`}
      disabled={!playable}
      onClick={() => onPlay?.(card)}
    >
      <span className={`card-corner ${isRed ? 'card-red' : ''}`}>
        <strong>{CARD_LABELS[card.rank]}</strong>
        <span>{symbol}</span>
      </span>
      <span className={`card-center ${isRed ? 'card-red' : ''}`}>{symbol}</span>
      <span className={`card-corner card-corner-bottom ${isRed ? 'card-red' : ''}`}>
        <strong>{CARD_LABELS[card.rank]}</strong>
        <span>{symbol}</span>
      </span>
    </button>
  );
}

function PlayerSeat({
  game,
  playerIndex,
  isActive,
  isYou,
}: {
  game: GameState;
  playerIndex: number;
  isActive: boolean;
  isYou: boolean;
}) {
  const player = game.players[playerIndex];
  const initials = player.name.slice(0, 1).toUpperCase();

  return (
    <div className={`player-seat ${isActive ? 'is-active' : ''} ${isYou ? 'is-you' : ''}`}>
      <div className="seat-avatar" aria-hidden="true">{initials}</div>
      <div className="seat-copy">
        <strong>{player.name}</strong>
        <span>{player.cards.length} cards</span>
      </div>
      {isActive && <span className="turn-pulse"><i /> Turn</span>}
      {player.drinks > 0 && <span className="drink-count">{player.drinks} drink{player.drinks === 1 ? '' : 's'}</span>}
    </div>
  );
}

function SuitPicker({ onSelect }: { onSelect: (suit: Suit) => void }) {
  return (
    <div className="suit-picker" role="dialog" aria-label="Choose a suit">
      <p>Choose the suit to request</p>
      <div>
        {SUITS.map((suit) => (
          <button key={suit} type="button" onClick={() => onSelect(suit)}>
            {suit === 'hearts' ? '♥' : suit === 'diamonds' ? '♦' : suit === 'clubs' ? '♣' : '♠'}
            <span>{suit}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function PracticeTable({ onExit }: { onExit: () => void }) {
  const [game, setGame] = useState<GameState>(() => createGame({ mode: 'practice', seed: Date.now() }));
  const [isThinking, setIsThinking] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState<string>('');
  const [aceSelection, setAceSelection] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [round, setRound] = useState(1);

  const human = game.players[0];
  const legalCards = useMemo(
    () => getLegalCards(game, human.id),
    [game, human.id],
  );
  const isHumanTurn = game.currentPlayerId === human.id && !game.question;
  const isWinner = game.winnerId === human.id;
  const currentBotIndex = game.players.findIndex(
    (player) => player.id === game.currentPlayerId,
  );

  const playHumanCard = useCallback((card: Card) => {
    if (!isHumanTurn) return;

    if (card.rank === 'A') {
      setAceSelection(true);
      return;
    }

    setGame((current) => playCard(current, human.id, card));
  }, [human.id, isHumanTurn]);

  const handleAce = useCallback((suit: Suit) => {
    if (!isHumanTurn || !aceSelection) return;
    setAceSelection(false);
    const ace = human.cards.find((card) => card.rank === 'A');
    if (!ace) return;
    setGame((current) => playCard(current, human.id, ace, { requestedSuit: suit }));
  }, [aceSelection, human, isHumanTurn]);

  const answerCurrentQuestion = useCallback(() => {
    if (!game.question || game.currentPlayerId !== human.id) return;
    const answer = questionAnswer.trim() || 'I will answer when I am ready.';
    setQuestionAnswer(answer);
    setGame((current) => answerQuestion(current));
  }, [game.currentPlayerId, game.question, human.id, questionAnswer]);

  useEffect(() => {
    if (game.winnerId || isHumanTurn || currentBotIndex < 0 || currentBotIndex === 0) return;

    setIsThinking(true);
    const botTimer = window.setTimeout(() => {
      setGame((current) => {
        if (current.question) return answerQuestion(current);

        const currentBot = current.players.find((player) => player.id === current.currentPlayerId);
        if (!currentBot) return current;

        const legal = getLegalCards(current, currentBot.id);
        if (legal.length > 0) {
          const special = legal.find((card) => ['K', 'J', 'Q', 'Joker', 'A'].includes(card.rank));
          const chosen = special ?? legal[0];

          if (chosen.rank === 'A') {
            const requestedSuit = ['hearts', 'diamonds', 'clubs', 'spades'][currentBotIndex % 4] as Suit;
            return playCard(current, currentBot.id, chosen, { requestedSuit });
          }

          if (chosen.rank === 'Q' || chosen.rank === '8') {
            return playCard(current, currentBot.id, chosen, {
              question: `${currentBot.name} asks: “What card should I play next?”`,
            });
          }

          return playCard(current, currentBot.id, chosen);
        }

        if (current.drawPile.length === 0) {
          return current;
        }

        const drawn = drawCard(current, currentBot.id);
        const drawnBot = drawn.players.find((player) => player.id === currentBot.id);
        const drawnCard = drawnBot?.cards.at(-1);
        if (!drawnCard || !getLegalCards(drawn, currentBot.id).length) return drawn;
        return playCard(drawn, currentBot.id, drawnCard);
      });
      setIsThinking(false);
    }, 900);

    return () => window.clearTimeout(botTimer);
  }, [currentBotIndex, game.currentPlayerId, game.question, game.winnerId, isHumanTurn]);

  useEffect(() => {
    if (game.question && game.currentPlayerId !== human.id) {
      setQuestionAnswer('');
    }
  }, [game.currentPlayerId, game.question, human.id]);

  const restart = () => {
    setGame(createGame({ mode: 'practice', seed: Date.now() }));
    setRound((current) => current + 1);
    setAceSelection(false);
    setQuestionAnswer('');
  };

  return (
    <main className="practice-screen">
      <header className="practice-header">
        <button className="back-button" type="button" onClick={onExit}>
          <ArrowLeft size={18} /> Back to hub
        </button>
        <div className="practice-title">
          <span className="practice-mark"><Sparkles size={18} /></span>
          <div>
            <strong>Offline practice</strong>
            <small>Round {round} · No score loss</small>
          </div>
        </div>
        <button className="restart-button" type="button" onClick={restart}>
          <RotateCcw size={17} /> Restart
        </button>
      </header>

      <section className="table-wrap">
        <div className="table-glow" aria-hidden="true" />
        <div className="table-surface">
          <div className="table-topbar">
            <div className="turn-indicator">
              <span className={isHumanTurn ? 'turn-dot human' : 'turn-dot'} />
              <strong>{game.winnerId ? 'Round complete' : game.question ? 'Question pending' : isHumanTurn ? 'Your turn' : `${game.players.find((player) => player.id === game.currentPlayerId)?.name ?? 'Bot'} is playing`}</strong>
              <small>{game.direction === 'clockwise' ? 'Clockwise' : 'Counterclockwise'}</small>
            </div>
            <div className="table-stat"><Users size={16} /><span>5 players</span></div>
            <div className="table-stat"><Trophy size={16} /><span>Practice only</span></div>
          </div>

          <div className="player-positions">
            <PlayerSeat game={game} playerIndex={1} isActive={game.currentPlayerId === game.players[1].id} isYou={false} />
            <PlayerSeat game={game} playerIndex={2} isActive={game.currentPlayerId === game.players[2].id} isYou={false} />
            <PlayerSeat game={game} playerIndex={3} isActive={game.currentPlayerId === game.players[3].id} isYou={false} />
            <PlayerSeat game={game} playerIndex={4} isActive={game.currentPlayerId === game.players[4].id} isYou={false} />
          </div>

          <div className="table-center">
            <div className="draw-zone">
              <div className="pile-stack" aria-label={`${game.drawPile.length} cards remaining`}>
                <span className="pile-card pile-card-one" />
                <span className="pile-card pile-card-two" />
                <span className="pile-card pile-card-three" />
                <span className="pile-count">{game.drawPile.length}</span>
              </div>
              <div>
                <small>Draw pile</small>
                <strong>Keep your hand sharp</strong>
              </div>
            </div>

            <div className="top-card-zone">
              <span className="stack-label">Top card</span>
              <CardFace card={game.topCard} compact />
              {game.requestedSuit && (
                <span className="requested-suit">Request: {game.requestedSuit}</span>
              )}
            </div>

            <div className="table-message">
              <span className="message-icon"><MessageCircleQuestion size={20} /></span>
              <div>
                <small>{game.lastEvent?.type === 'win' ? 'Round result' : 'Table activity'}</small>
                <strong>{game.lastEvent?.message ?? 'The table is ready.'}</strong>
              </div>
            </div>
          </div>

          <div className="human-zone">
            <PlayerSeat game={game} playerIndex={0} isActive={game.currentPlayerId === human.id} isYou />
            <div className="hand-area">
              <div className="hand-heading">
                <span><Hand size={17} /> Your hand</span>
                <small>{human.cards.length} cards · {legalCards.length} playable</small>
              </div>
              <div className="card-hand">
                {human.cards.map((card) => (
                  <CardFace
                    key={card.id}
                    card={card}
                    playable={legalCards.some((legalCard) => legalCard.id === card.id) && isHumanTurn}
                    onPlay={playHumanCard}
                  />
                ))}
              </div>
              <div className="hand-actions">
                {isHumanTurn && legalCards.length > 0 && (
                  <button className="play-hint" type="button">
                    <CircleHelp size={17} /> Select a highlighted card to play
                    <ChevronRight size={17} />
                  </button>
                )}
                {isHumanTurn && legalCards.length === 0 && (
                  <button
                    className="draw-button"
                    type="button"
                    onClick={() => setGame((current) => drawCard(current, human.id))}
                  >
                    <Hand size={17} /> Draw a card
                  </button>
                )}
                {!isHumanTurn && (
                  <button className="bot-thinking" type="button" disabled>
                    <Bot size={17} /> {isThinking ? 'Bot is thinking…' : 'Waiting for the table…'}
                  </button>
                )}
                {game.question && game.currentPlayerId === human.id && (
                  <div className="question-panel">
                    <span><MessageCircleQuestion size={18} /> Answer the question</span>
                    <input
                      value={questionAnswer}
                      onChange={(event) => setQuestionAnswer(event.target.value)}
                      placeholder="Type your answer"
                      aria-label="Answer the question"
                    />
                    <button type="button" onClick={answerCurrentQuestion}>Answer</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="activity-panel">
          <div className="activity-heading">
            <div>
              <small>Live activity</small>
              <strong>Table journal</strong>
            </div>
            <button type="button" onClick={() => setShowRules((current) => !current)} aria-label="Toggle rules">
              <CircleHelp size={18} />
            </button>
          </div>
          <div className="activity-list">
            <div className="activity-item active">
              <span>{game.lastEvent?.type === 'win' ? <Crown size={17} /> : <Sparkles size={17} />}</span>
              <p><strong>{game.lastEvent?.message}</strong><small>Latest action</small></p>
            </div>
            {game.discardPile.slice(-4).reverse().map((card, index) => (
              <div className="activity-item" key={`${card.id}-${index}`}>
                <span>{card.rank === 'Joker' ? '✦' : card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}</span>
                <p><strong>{CARD_LABELS[card.rank]} played</strong><small>Discard pile</small></p>
              </div>
            ))}
          </div>
          {showRules && (
            <div className="rules-popover">
              <strong>How to play</strong>
              <p>Match the top card rank or suit. Kings reverse play. Jacks skip a player. Queens and 8s ask a question. Jokers create a drink.</p>
            </div>
          )}
        </aside>
      </section>

      {aceSelection && <SuitPicker onSelect={handleAce} />}

      {game.winnerId && (
        <div className="winner-overlay" role="dialog" aria-label="Round complete">
          <div className="winner-card">
            <span className="winner-icon"><Crown size={31} /></span>
            <p>{isWinner ? 'Practice complete' : 'A bot won this round'}</p>
            <h2>{isWinner ? 'You won the table!' : `${game.players.find((player) => player.id === game.winnerId)?.name} won the round`}</h2>
            <span>No points were awarded.</span>
            <button type="button" onClick={restart}><RotateCcw size={17} /> Play another round</button>
          </div>
        </div>
      )}
    </main>
  );
}
