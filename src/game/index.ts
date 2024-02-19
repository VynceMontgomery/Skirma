import {
  createGame,
  createBoardClasses,
  Player,
  Board,
  ElementFinder,
} from '@boardzilla/core';

/*
 * Some globals
 *
 * yes, I know.
 */

const knight_units = [[-2,-1], [-2,1], [1,-2], [-1,-2], [2,1], [2,-1], [-1,2], [1,2]];
const bishop_units = [[1,1], [1,-1], [-1,-1], [-1,1]];
const rook_units = [[1,0], [-1,0], [0,1], [0,-1]];
const queen_units = [...rook_units, ...bishop_units];


// Some pseudo-globals. Eventually, i'd like to move these into something less global, more config-like
const boardSize = 9;

const setupGrid = {
  Queen:  [[
            [2,2], [8,2],
          ], [
            [2,8], [8,8], 
          ]],
  Rook:   [[2,3], [3,8], [7,2], [8,7]],
  Bishop: [[4,2], [4,7], [6,3], [6,8]],
  Knight: [[2,6], [3,4], [7,6], [8,4]],
  Pawn:   [
            [1,2], [1,7], [2,4], [2,9], 
            [3,1], [3,6], [4,3], [4,8], 
            [5,5], 
            [6,2], [6,7], [7,4], [7,9], 
            [8,1], [8,6], [9,3], [9,8],
          ],
};

// for other boards, will have to just change this to number 
interface SkirmaLocation {
  row: 1|2|3|4|5|6|7|8|9;
  column: 1|2|3|4|5|6|7|8|9;
}

// STUB: really would prefer this took figures in role &promote, but ... 
interface SkirmaMove {
  player: SkirmaPlayer;
  role: string;
  // figure: Figure;
  from: SkirmaLocation;
  to: SkirmaLocation;
  capture: boolean;
  promote?: string;
  // promote?: Figure;
}

// not sure i need this
interface SkirmaVector {
  v: [number, number];
}

export class SkirmaPlayer extends Player<SkirmaPlayer, SkirmaBoard> {
  /**
   * Any properties of your players that are specific to your game go here
   */

  eliminated: boolean = false;

  highs () {
    return this.board.first(Space, 'chessboard').all(High, {player: this});
  }

  agents () {
    return this.board.first(Space, 'chessboard').all(Figure, {agentOf: this});
  }  

  zoneMemo: {top: number, bottom: number, left: number, right: number} | undefined = undefined;

  zone (force: boolean = false) {
    if (!force && this.zoneMemo) return this.zoneMemo;

    const zoneGuess = {
      top:    (Math.min(...this.highs().map((f) => f.square()?.row))),
      bottom: (Math.max(...this.highs().map((f) => f.square()?.row))),
      left:   (Math.min(...this.highs().map((f) => f.square()?.column))),
      right:  (Math.max(...this.highs().map((f) => f.square()?.column))),
    }

    // I don't think this is necessary, but why remove santy checking?
    if (['top', 'bottom', 'left', 'right'].some((e) => !zoneGuess[e])) {
      this.zoneMemo = undefined;
      return this.zoneMemo;
    } else {
      this.zoneMemo = zoneGuess;
      return this.zoneMemo;
    }
  }

  hasInZone (el) {
    let loc: Square;

    if (el.row && el.column) {
        loc = el;
    } else {
        loc = el.container(Square);
        if (!loc) return false;
    }

    const {top, bottom, left, right} = this.zone();

    // remember, rows are low at the top.
    if (loc.row >= top && loc.row <= bottom
        && loc.column >= left && loc.column <= right) {
            return true;
    }
    return false;
  }

  zoneEF (): ElementFinder {
    const {top, bottom, left, right} = this.zone();

    return (loc) => (
      loc.row >= top && loc.row <= bottom
        && loc.column >= left && loc.column <= right
    );
  }

  // STUB I'm sure this is what generics are for; bone up. But for now:

  zoneSquares (): Square[] {
    return this.board.first('chessboard').all(Square, this.zoneEF());
  }

  zoneFigures (): Figure[] {
    return this.board.first('chessboard').all(Figure, (f) => [f.square()].filter(this.zoneEF()).length);
  }

  zoneLows (): Low[] {
    return this.board.first('chessboard').all(Low, (f) => [f.square()].filter(this.zoneEF()).length);
  }

  influenced () : Figure[] {
    const rabble = this.zoneLows().filter(f => (!f.agentOf || f.agentOf === this));
    return this.highs().concat(this.agents()).concat(rabble).filter((v, i, a) => i === a.indexOf(v));
  }
}

class SkirmaBoard extends Board<SkirmaPlayer, SkirmaBoard> {
  /**
   * Any overall properties of your game go here
   */
  phase: number = 0;

  readonly moveLog: [] = [];
  // readonly moveLog: SkirmaMove[] = [];

  recordMove (move:SkirmaMove) {
    this.moveLog.push(move);
    // console.log(`recorded move number ${this.moveLog.length}: ${Figure.letter(move.role)}` +
    //    Square.toLocString(move.from) +
    //    (move.capture ? 'x' : '-') +
    //    Square.toLocString(move.to) +
    //    (move.promote ? '=' + Figure.letter(move.promote) : '')
    //    );
  }

  amendMove (diff:Partial<SkirmaMove>) {
    if (this.moveLog.length) {
      const old = this.moveLog.pop();
      const move = {...old, ...diff}
      this.moveLog.push(move);
      // console.log(`amended move number ${this.moveLog.length}:  ${Figure.letter(move.role)}` +
      //    Square.toLocString(move.from) +
      //    (move.capture ? 'x' : '-') +
      //    Square.toLocString(move.to) +
      //    (move.promote ? '=' + Figure.letter(move.promote) : '')
      //    );
    } else {
      this.recordMove(diff);
    }
  }

  lastMove () {
    return this.moveLog.at(-1);
  }
}

const { Space, Piece } = createBoardClasses<SkirmaPlayer, SkirmaBoard>();

export { Space };

/**
 * Define your game's custom pieces and spaces.
 */

export class Square extends Space {
  static toLocString (loc: SkirmaLocation) {
    return '?abcdefghi'.charAt(loc.column) + (boardSize + 1 - loc.row);
  }

  // loc (): SkirmaLocation {
  loc () {
    if (! this.row && this.column) console.log(`this has tr ${this.row} tc ${this.column} fwiw, which is bad for `, this);
    const {row, column} = this;
    return ({row, column});
  }

  locString (): string {
    return Square.toLocString(this);
    // return 'abcdefghi'.at(this.column) + (boardSize + 1 - this.row);
  }

  isEdge (): boolean {
    return [this.row, this.column].some((v) => [1,boardSize].includes(v));
  }

  inZones (): SkirmaPlayer[] {
    return this.game.players.filter(p => p.hasInZone(this));
  }
}

export abstract class Figure extends Piece {
  readonly role: string;
  // role: 'Queen'|'General'|'Rook'|'Bishop'|'Knight'|'Pawn',

  readonly rank: 'high' | 'low';
  // rank (): 'high' | 'low' (this.instanceOf(High) ? 'high' : 'low')

  agentOf?: Player;

  static letter (role: string) {
    if (role === 'Knigt') {
      return 'N';
    } else {
      return role.charAt(0);
    }
  }

  square () { return this.container(Square) }

  // do i need this?
  // loc (): SkirmaLocation {
  loc () {
    // return {row, column};
    // console.log(`Agent ${this} currently at `, this.square() , ` - is that bad?`);
    const {row, column} = this.square();
    // console.log(`Figure ${this}.loc(): row, ${row}, column, ${column}`);
    return ({row, column});
  }

  // STUB probably bogus; replace with player.influenced().includes || game.players.filter etc.
  influence (player?): Player[] | boolean {
    const influenceList: Player[] = [];

    if (this.player) {
        influenceList.push(this.player);
    } else if (this.agentOf) {
        influenceList.push(this.agentOf);
    } else {
        influenceList.push(...this.game.players.filter((p) => p.hasInZone(this)));
    }

    if (player) {
        return influenceList.includes(player);
    } else {
        return influenceList;
    }
  }

  unitMoves (units): Square[] {
    return units.map (
      ([r,c]) => this.board.first(Square, {
        row: this.square().row + r, 
        column: this.square().column + c, 
    })).filter((s) => s);    
  }

  vectorMoves (vectors): Square[] {
    const here = this.square();
    const valids: Square[] = [];

    vectors.forEach(([r,c]) => {
      let next = this.board.first(Square, {row: here.row + r, column: here.column + c});
      while (next) {
        valids.push(next);
        if (!next.has(Figure)) {
            next = this.board.first(Square, {row: next.row + r, column: next.column + c});
        } else {
            next = undefined;
        }
      }
    });

    return valids;
  }

  validMoves (): Square[]

}

export abstract class High extends Figure {
  readonly player: Player;
  rank: 'high' = 'high';
}

export abstract class Low extends Figure {
  rank: 'low' = 'low';
  // agentOf: Player | undefined;
}

export class Queen extends High {
  readonly role = 'Queen';
  validMoves () { return this.vectorMoves(queen_units).filter((s) => !s.has(Queen)) }
}

export class General extends High {
  readonly role = 'General';
  validMoves () { return this.unitMoves([...knight_units, ...queen_units]) }
}

export class Knight extends Low {
  readonly role = 'Knight';
  validMoves () { return this.unitMoves(knight_units) }
}

export class Rook extends Low {
  readonly role = 'Rook';
  validMoves () { return this.vectorMoves(rook_units) }
}

export class Bishop extends Low {
  readonly role = 'Bishop';
  validMoves () { return this.vectorMoves(bishop_units) }
}

export class Pawn extends Low {
  readonly role = 'Pawn';
  validMoves () {
    const steps = this.unitMoves(rook_units).filter((s) => !s.has(Figure));
    const takes = this.unitMoves(bishop_units).filter((s) => s.has(Figure));
    return steps.concat(takes);
  }
}


export default createGame(SkirmaPlayer, SkirmaBoard, game => {

  const { board, action } = game;
  const { playerActions, loop, eachPlayer } = game.flowCommands;

  /**
   * Register all custom pieces and spaces
   */
  board.registerClasses(
    Square,
    Figure, High, Low, 
    Queen, General, Rook, Bishop, Knight, Pawn, 
  );

  /**
   * Create your game board's layout and all included pieces.
   */

  board.create(Space, 'chessboard');
  $.chessboard.createGrid({
    rows: boardSize,
    columns: boardSize,
    style: 'square'
  }, Square, 'square');

  $.chessboard.all(Square).forEach(sq => {
    sq.onEnter(High, h => {
      delete h.player.zoneMemo;
    });
    sq.onExit(High, h => {
      delete h.player.zoneMemo;
    });
  });

  board.create(Space, 'box');
  $.box.onEnter(Low, f => delete f.agentOf);

  for (const player of game.players) {
    $.box.createMany(3, General, 'G', {player});
    setupGrid.Queen[game.players.turnOrderOf(player)].forEach(
      ([row, column]) => $.chessboard.atPosition({row, column}).create(Queen, 'Q', {player})
    );
  }

  setupGrid['Rook'].forEach(
    ([row, column]) => $.chessboard.atPosition({row, column}).create(Rook, 'R')
  );

  setupGrid['Bishop'].forEach(
    ([row, column]) => $.chessboard.atPosition({row, column}).create(Bishop, 'B')
  );

  setupGrid['Knight'].forEach(
    ([row, column]) => $.chessboard.atPosition({row, column}).create(Knight, 'N')
  );

  setupGrid['Pawn'].forEach(
    ([row, column]) => $.chessboard.atPosition({row, column}).create(Pawn, 'P')
  );

  // spares for promotion
  $.box.createMany(3, Rook, 'R');
  $.box.createMany(3, Bishop, 'B');
  $.box.createMany(3, Knight, 'N');


  /**
   * Define all possible game actions.
   */
  game.defineActions({

    pass: player => action({
      prompt: 'nevermind',
      condition: game.players.turnOrderOf(player) == 0,
    }),

    designateAgents: player => action({
      prompt: 'Designate your starting agent',
      condition: game.players.turnOrderOf(player) > 0,
    }).chooseOnBoard(
      'figures',
      () => {
        return $.chessboard.all(Low, (f) => ((f.square().column > (1+boardSize / 2)) && !f.influence(player)))
      },   // for 4p, will have to beter define this; probably jsut by proximity?  maybe a map. *shrug*
      {
        number: game.players.turnOrderOf(player),
        confirm: undefined,     // doesn't work yet, futurecreep
      },
    ).do(
      ({figures}) => {
        figures.forEach(f => {
          f.agentOf = player;
          // board.recordMove({figure: f, from: f.loc(), to: f.loc(), capture: false, player});
          board.recordMove({role: f.role, from: f.loc(), to: f.loc(), capture: false, player});
        });
    }).message(
      `{{ player }} designates {{ figures }} at {{ locString }} to be their agent{{ s }}.`, 
      ({figures}) => ({
        locString: figures.map(f => f.square().locString()).join(', '),
        s: figures.length != 1 ? 's' : '',
    }),
    ),

    moveFigure: player => action({
      prompt: 'Your Move',
    }).chooseOnBoard(
      'figure',
      () => player.influenced(),
      { skipIf: 'never'},
    ).chooseOnBoard(
      'dest',
      ({figure}) => figure.validMoves(),
      { skipIf: 'never'},
    ).message(
      `{{ player }} moves {{ role }} {{start}} to {{end}}{{ capture }}.`, 
      ({figure, dest}) => ({
        role: figure.role,
        start: figure.square().locString(),
        end: dest.locString(),
        capture: (dest.has(Figure) ? `, capturing ${dest.first(Figure).role}.` : ``),
      })
    ).do(({figure, dest}) => {
      const capture = dest.has(Figure);
      if (capture) {
        const captured = dest.first(Figure);

        let vic: Player | undefined = undefined;
        if (captured.player) {
          vic = captured.player;
        } else {
          vic = captured.agentOf;
        }

        captured.putInto($.box);

        if (vic) {
          const highCount = vic.highs().length;
          if (highCount === 0 && !vic.agents().length) {
            vic.game.message(`${ vic } has been eliminated.`);
            vic.eliminated = true;
            const remaining = game.players.filter((p) => !p.eliminated);

            if (remaining.length === 1) {
              game.finish(remaining[0]);
            }
          }
        }
      }

      board.recordMove({player, role: figure.role, from: figure.loc(), to: dest.loc(), capture, });
      // board.recordMove({player, figure, from: figure.loc(), to: dest.loc(), capture, });


      figure.putInto(dest);
      player.agents().forEach(f => delete f.agentOf);
      figure.agentOf = player;
      // player.agent = (figure.rank === 'low' ? figure : undefined);

      if (figure.role === 'Pawn' && dest.isEdge() && !player.hasInZone(dest)) {
        game.followUp({name: 'promote'});
      }

      if (! $.chessboard.all(Low).some((f) => !player.influenced().includes(f))) {
        game.finish(player);
      }
    }),

    resign: player => action({
      prompt: 'Are you sure?',
      skipIf: 'never',
    }).chooseFrom(
      'resign',
      ['Resign'],
      { skipIf: 'never'},
    ).chooseFrom(
      'confirm',
      ['Yes, resign', 'Cancel'],
      { skipIf: 'never'},
    ).message(
      `{{player}} {{verb}}.`, 
      ({confirm}) => ({ verb : ((confirm === 'Yes, resign') ? `resigns` : `continues` ) }),
    ).do(({confirm}) => {
      if (confirm === 'Yes, resign') {
        player.eliminated = true;
        const remaining = game.players.filter((p) => !p.eliminated);

        if (remaining.length === 1) {
          game.finish(remaining[0]);
        }
      } else {
        game.followUp({name: 'moveFigure'});
      }
    }),

    promote: player => action({
      prompt: 'Would you like to promote this Pawn?'
    }).chooseFrom(
      'order',
      () => {
        let opts = [];
        if ($.chessboard.all(High, {mine: true}).length < 3) {    // STUB: highsLimit? 
          opts.push('General');                                   // STUB: list of high pieces?
        }

        opts.push(
          ...$.box.all(Low, (f) => f.role != 'Pawn').map(
            (f) => f.role
          ).filter(
            (v, i, a) => i === a.indexOf(v)
          )
        );

        opts.push('skip');

        return opts;
      }
    ).do(({order}) => {
      const lastMove = board.lastMove();
      const baby = $.chessboard.first(Pawn, (f) => (f.square()?.row == lastMove.to.row && 
                                                 f.square()?.column == lastMove.to.column));
      const dest = baby.square();

      let upgrade;

      if (order === 'skip') {
        return;
      } else if (order === 'General') {
        upgrade = $.box.first(General, {mine: true});
      } else {
        upgrade = $.box.first(Figure, {role: order});
      }
      upgrade.putInto(dest);
      upgrade.agentOf = player;
      baby.putInto($.box);
      // board.amendMove({promote: upgrade});
      board.amendMove({promote: upgrade.role});
    }).message(
      `{{ player }} {{promotion}}`, 
      ({order}) => ({ promotion: ((order === 'skip') ? `chose not to promote.` : `promoted the pawn to a ${ order }.`) }),
    ),

  });

  /**
   * Define the game flow, starting with board setup and progressing through all
   * phases and turns.
   */
  game.defineFlow(
    eachPlayer({
      name: 'player',
      do: playerActions({
        actions: ['designateAgents', 'pass'],
      }),
    }),

    () => board.phase = 1,

    loop(
      eachPlayer({
      name: 'player',
      do: playerActions({ 
          actions: ['moveFigure', 'resign']
        }),
      })
    ),
  );
});
