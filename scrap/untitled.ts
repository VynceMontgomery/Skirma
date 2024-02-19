
Skirma as boardzilla notes:

2p.   4p can wait. 

(a) spaces: 

Chessboard extends Space
size: 9 // futureCreep: choose opening board

Square extends Space
isEdge () => [this.row, this.column].any((v) => [1,9].includes(v))
locString () => 'abcdefghi'[this.container().column] + (board.size + 1 - this.container().row);


const chessboard = board.create(Chessboard);
chessboard.createGrid({size: $.chessboard.size}, Square);


(b) pieces: (have to make them all at the outset?  ugh. i guess make an extra of each of the 3 low men, plus per player 3 generals ... or G, Arch, and (Tank))

figure extends piece: 
  rank: 'high' | 'low' // do i need this? if it's in class hierarchy, i don't think i do
  role: 'Queen', 'General', 'Rook', 'Bishop', 'Knight', 'Pawn',
  // influence: 'neutral' | Player | Player[],
  influence (player?) => {
    const influenceList Player[];
    if (this.player) {
        influenceList.push(this.player);
    } else if (this.agentOf) {
        influenceList.push(this.agentOf);
    } else {
        influenceList.push(...game.players.filter((p) => p.inZone(this)));
    }

    if (player) {
        return influenceList.includes(player);
    } else {
        return influenceList;
    }
  }

  validMoves

high extends figure:
  rank: high
  role: 'Queen', 'General',
  player: Player

low extends figure:
  rank: low
  role: 'Rook', 'Bishop', 'Knight', 'Pawn',
  agentOf?: Player
  beAgentOf (player) => {
    player.all(Low, {agentOf: player}).forEach((f) => delete f.agentOf);
    this.agentOf = player;
  }

Queen extends high
  validMoves (this) => {
    const here = this.container('square');
    const valids = Square[];

    [-1,0,1].foreach((c) => {
        [-1,0,1].forEach((r) => {
            let look = board.first(Square, {column: here.column + c, row: here.row + r});
            while (look && ! look.has(Queen)) {
                valids.push(look);
                if (!look.has(Figure)) {
                    look = board.first(Square, {column: look.column + c, row: look.row + r});
                } else {
                    look = undefined;
                }
            }
        })
    });

    return valids;
  }

etc. 

(c) player: 

(maybe also have zoneTop, zoneBottom, zoneLeft, and zoneRight for border drawing purposes?)

inZone (el) {
    let loc: Square;
    if (el.row && el.column) {
        loc = el;
    } else {
        loc = el.container('Square');
    }

    const highs = board.all(High, {player: this});
    [[min, max] x [row, column]](highs);
    if (loc.row >= rowMin && loc.row <= rowMax
        && loc.column >= colMin && loc.column <= colMax) {
            return true;
    }
    return false;
}

flow: 

  game.defineFlow(
    game.players[1]({                   // syntax
      name: 'player',
      do: playerActions({
        actions: ['designateAgents']    // STUB: times based on seating position... how? ..would ove a chooseMultiOnBoard
      }),
    }),

    () => board.phase = 1,

    eachPlayer({
    name: 'player',
    do: [
      playerActions({ actions: [
        'moveFigure', 'resign'
      ]}),
    ]})
  );


designateAgent: player => action({
    prompt: 'Designate your starting agent',
}).chooseOnBoard({
    'figure',
    () => board.all(Low, {influence: 'neutral'}),
}).do({
    (figure) => figure.agentOf = player;    
}).message(
    `${ player } designates ${f.role} at ${f.locString()} to be their agent.`
)

makeMove: player=> action({
    prompt: 'Designate your starting agent',
}).chooseOnBoard(
    'figure',
    () => board.all(Figure, (f) => f.influence(player)),
).chooseOnBoard(
    'dest',
    ({figure}) => figure.validMoves(),
).do(({dest, figure}) => {
    if (dest.has(Figure) {                  // implicitly:  && !(figure.is(Queen) && dest.any(Figure).is(Queen)))
        dest.all(Figure).putInto($.box);
    }

    figure.putInto(dest);
    player.all(Low, {agentOf : player}).forEach((f) => delete f.agentOf);
    if (figure.is(Low)) figure.agentOf = player;

    if (figure.is(Pawn) && dest.isEdge() && !player.inZone(dest)) {
        // followUp: offer promotion
    }

    if (! chessboard.has(Low, (f) => !f.influence(player))) {
        game.finish(player);
    }
}).message(
    "i'd love to tell you where that went and whether it was a capture"
)

