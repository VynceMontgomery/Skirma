import {
  createGame,
  createBoardClasses,
  Player,
  Board,
} from '@boardzilla/core';

/*
 * Some globals
 *
 * yes, I know.
 */

const knight_units: [number, number][] = [[-2,-1], [-2,1], [1,-2], [-1,-2], [2,1], [2,-1], [-1,2], [1,2]];
const bishop_units: [number, number][] = [[1,1], [1,-1], [-1,-1], [-1,1]];
const rook_units: [number, number][] = [[1,0], [-1,0], [0,1], [0,-1]];
const queen_units: [number, number][] = [...rook_units, ...bishop_units];


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
  figure: Figure;
  from: SkirmaLocation;
  to: SkirmaLocation;
  capture: boolean;
  promote?: Figure;
}

// not sure i need this
// if I do, not sure this is the right way to do it. Tuple?
interface SkirmaVector {
  v: [number, number];
}

export class SkirmaPlayer extends Player<SkirmaPlayer, SkirmaBoard> {
  /**
   * Any properties of your players that are specific to your game go here
   */

  eliminated: boolean = false;

  highs (): High[] {
    return this.board.first(Space, 'chessboard')!.all(High, {player: this});
  }

  agents (): Figure[] {
    return this.board.first(Space, 'chessboard')!.all(Figure, {agentOf: this});
  }  

  zoneMemo: {top: number; bottom: number; left: number; right: number} | undefined = undefined;

  zone (force: boolean = false) {
    if (!force && this.zoneMemo) return this.zoneMemo;

    const zoneGuess = {
      top:    (Math.min(...this.highs().map((f:High) => f.square()!.row))),
      bottom: (Math.max(...this.highs().map((f:High) => f.square()!.row))),
      left:   (Math.min(...this.highs().map((f:High) => f.square()!.column))),
      right:  (Math.max(...this.highs().map((f:High) => f.square()!.column))),
      // top:    (Math.min(...this.highs().map((f:High) => f.square()?.row).filter((v: number | undefined) => !!v))),
      // bottom: (Math.max(...this.highs().map((f:High) => f.square()?.row).filter((v: number | undefined) => !!v))),
      // left:   (Math.min(...this.highs().map((f:High) => f.square()?.column).filter((v: number | undefined) => !!v))),
      // right:  (Math.max(...this.highs().map((f:High) => f.square()?.column).filter((v: number | undefined) => !!v))),
    }

    // I don't think this is necessary, but why remove santy checking?
    if (['top', 'bottom', 'left', 'right'].some((e: keyof typeof zoneGuess) => !zoneGuess[e])) {
      this.zoneMemo = undefined;
      return this.zoneMemo;
    } else {
      this.zoneMemo = zoneGuess;
      return this.zoneMemo;
    }
  }

  // hasInZone (el: Square | Figure) {
  //   if (!this.zone()) return false;
  //   let loc: Square;

  //   if (el.row && el.column) {
  //       loc = el as Square;
  //   } else if (el.square) {
  //       loc = el.square()!;
  //       if (!loc) return false;
  //   } else {
  //     return false;
  //   }

  //   const {top, bottom, left, right} = this.zone()!;

  //   // remember, rows are low at the top.
  //   if (loc.row >= top && loc.row <= bottom
  //       && loc.column >= left && loc.column <= right) {
  //           return true;
  //   }
  //   return false;
  // }

  zoneEF () {  // an ElementFinder
    if (!this.zone()) return false;
    const {top, bottom, left, right} = this.zone()!;

    return (loc:Square | SkirmaLocation) => (
      loc.row >= top && loc.row <= bottom
        && loc.column >= left && loc.column <= right
    );
  }

  zoneTest (loc: Square | SkirmaLocation): boolean {
    if (!this.zone()) return false;

    const {top, bottom, left, right} = this.zone()!;

    return (
      loc.row >= top && loc.row <= bottom
        && loc.column >= left && loc.column <= right
    );
  }

  // STUB I'm sure this is what generics are for; bone up. But for now:

  zoneSquares (): Square[] {
    return this.board.first('chessboard')!.all(Square, (s: Square) => !!(this.zoneTest(s)));
  }

  zoneFigures (): Figure[] {
    return this.board.first('chessboard')!.all(Figure, (f: Figure):boolean => !!(f.square() && this.zoneTest(f.square()!)));
  }

  zoneLows (): Low[] {
    return this.board.first('chessboard')!.all(Low, (f: Low):boolean => !!(f.square() && this.zoneTest(f.square()!)));
  }

  influenced () : Figure[] {
    const total: Figure[] = [];
    const rabble = this.zoneLows().filter(f => (!f.agentOf || f.agentOf === this));
    return total.concat(this.highs()).concat(this.agents()).concat(rabble).filter((v, i, a) => i === a.indexOf(v));
  }

  moveFigureFigureOptions() : Figure[] {
    this.board.playerActionName = 'moveFigure';
    this.board.actionName = 'figure';
    return this.influenced();
  }

  checkElimination () : boolean {
    if (this.eliminated) return this.eliminated;

    if (!this.highs().length && !this.agents().length) {
      this.game.message(`{{ player }} has been eliminated.`, {player: this});
      this.eliminated = true;
    }

    const remaining = this.game.players.filter((p) => !p.eliminated);

    if (remaining.length === 1) {
      this.game.finish(remaining[0]);
    }

  return this.eliminated;
  }
}

class SkirmaBoard extends Board<SkirmaPlayer, SkirmaBoard> {
  /**
   * Any overall properties of your game go here
   */
  phase: number = 0;
  playerActionName?: string = '';
  actionName?: string = '';


  readonly moveLog: SkirmaMove[] = [];
  // readonly moveLog: SkirmaMove[] = [];       // some day, maybe

  recordMove (move:SkirmaMove) {
    this.moveLog.push(move);                    // FIX comments below may be useful for tracking ref error
    // console.log(`recorded move number ${this.moveLog.length}: ${Figure.letter(move.role)}` +
    //    Square.toLocString(move.from) +
    //    (move.capture ? 'x' : '-') +
    //    Square.toLocString(move.to) +
    //    (move.promote ? '=' + Figure.letter(move.promote) : '')
    //    );
  }

  amendMove (diff:Partial<SkirmaMove>) {
    if (this.moveLog.length) {
      const old: SkirmaMove = this.moveLog.pop() as SkirmaMove; 
      const move = {...old, ...diff};             // as SkirmaMove ?
      this.moveLog.push(move as SkirmaMove);
      // console.log(`amended move number ${this.moveLog.length}:  ${Figure.letter(move.role)}` +
      //    Square.toLocString(move.from) +
      //    (move.capture ? 'x' : '-') +
      //    Square.toLocString(move.to) +
      //    (move.promote ? '=' + Figure.letter(move.promote) : '')
      //    );
    } else {
      this.recordMove(diff as SkirmaMove);
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

  gridparity: string = ''; // STUB why not: 'odd' | 'even' | '' = '';  // i don't understand.

  row: number;
  column: number;

  // loc (): SkirmaLocation {
  loc () {
    if (! this.row && this.column) console.log(`this has tr ${this.row} tc ${this.column} fwiw, which is bad for `, this);
    const {row, column} = this;
    return ({row, column});
  }

  locString (): string {
    return Square.toLocString(this as SkirmaLocation);
    // return 'abcdefghi'.at(this.column) + (boardSize + 1 - this.row);
  }

  isEdge (): boolean {
    return [this.row || 0, this.column || 0].some((v:number) => [1,boardSize].includes(v));
  }

  inZones (): SkirmaPlayer[] {
    return this.game.players.filter(p => p.zoneTest(this));
  }
}

export class Figure extends Piece {
  readonly role: string;
  // role: 'Queen'|'General'|'Rook'|'Bishop'|'Knight'|'Pawn',

  readonly rank: 'high' | 'low';
  // rank (): 'high' | 'low' (this.instanceOf(High) ? 'high' : 'low')

  agentOf?: SkirmaPlayer;

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
  loc (): SkirmaLocation | undefined {
    if (this.square()) return this.square() as SkirmaLocation;
    return undefined;
    // const {row, column} = this.square();
    // return ({row, column});
  }

  // STUB probably bogus; replace with player.influenced().includes || game.players.filter etc.
  influence (player?: SkirmaPlayer): SkirmaPlayer[] | boolean {
    // const influenceList: SkirmaPlayer[] = [];

    // if (this.player) {
    //     influenceList.push(this.player);
    // } else if (this.agentOf) {
    //     influenceList.push(this.agentOf);
    // } else {
    //     influenceList.push(...this.game.players.filter((p) => p.hasInZone(this)));
    // }

    if (player) {
        return player.influenced().includes(this);
    } else {
        return this.game.players.filter((p) => p.influenced().includes(this))
    }
  }

  unitMoves (units: [number, number][]): Square[] {
    const here = this.square();
    if (!(here && here.row && here.column)) return [];

    const valids: Square[] = [];

    units.forEach(([r,c]) => {
      let look = this.board.first(Square, {
        row: here.row! + r, 
        column: here.column! + c, 
      });

      if (look) valids.push(look);
    });

    return valids;
  }

  vectorMoves (vectors: [number, number][]): Square[] {
    const here = this.square();
    if (!(here && here.row && here.column)) return [];

    const valids: Square[] = [];

    vectors.forEach(([r,c]) => {
      let next = this.board.first(Square, {row: here.row! + r, column: here.column! + c});  // confirmed 5 lines up. what gives?
      while (next && next.row && next.column) {
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

  validMoves (): Square[] {
    return [] as Square[];
  }

  moveFigureDestOptions() : Square[] {
    this.board.playerActionName = 'moveFigure';
    this.board.actionName = 'dest';
    return this.validMoves();
  }

  moveTo ({player, dest}: {player: SkirmaPlayer, dest: Square}): void {
    const capture = !!(dest.first(Figure)?.captured());

    this.board.recordMove({player, figure: this, from: this.loc()!, to: dest.loc() as SkirmaLocation, capture, });
    // this.board.recordMove({player, role: this.role, from: this.loc(), to: dest.loc(), capture, });

    this.putInto(dest);

    player.agents().forEach((f:Figure) => delete f.agentOf);
    this.agentOf = player;
  }


  captured (): boolean {
    if (!(this.loc()?.row && this.loc()?.column)) return false;

    let vic: SkirmaPlayer | undefined = undefined;

    if (this.player) {
      vic = this.player;
    } else {
      vic = this.agentOf;
    }

    this.putInto(this.board.first('box')!);

    if (vic) {
      vic.checkElimination();
    }

    return true;
  }
}

export class High extends Figure {
  readonly player: SkirmaPlayer;
  rank: 'high' = 'high';
}

export class Low extends Figure {
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
  $.box.onEnter(Figure, f => delete f.agentOf);

  for (const player of game.players) {
    $.box.createMany(3, General, 'G', {player});
    setupGrid.Queen[game.players.turnOrderOf(player)].forEach(
      ([row, column]) => $.chessboard.atPosition({row, column})?.create(Queen, 'Q', {player})
    );
  }

  setupGrid['Rook'].forEach(
    ([row, column]) => $.chessboard.atPosition({row, column})?.create(Rook, 'R')
  );

  setupGrid['Bishop'].forEach(
    ([row, column]) => $.chessboard.atPosition({row, column})?.create(Bishop, 'B')
  );

  setupGrid['Knight'].forEach(
    ([row, column]) => $.chessboard.atPosition({row, column})?.create(Knight, 'N')
  );

  setupGrid['Pawn'].forEach(
    ([row, column]) => $.chessboard.atPosition({row, column})?.create(Pawn, 'P')
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
        return $.chessboard.all(Low, (f) => 
          (((f.square()?.column || 0) > ((1+boardSize) / 2)
            ) && !(f.influence(player)))
        )
      },   // for 4p, will have to beter define this; probably jsut by proximity?  maybe a map. *shrug*
      {
        number: game.players.turnOrderOf(player),
        confirm: undefined,     // doesn't work yet, futurecreep
      },
    ).do(
      ({figures}) => {
        figures.forEach(f => {
          const loc = f.loc();
          if (!loc) return;
          f.agentOf = player;
          board.recordMove({figure: f, from: loc, to: loc, capture: false, player});
          // board.recordMove({role: f.role, from: f.loc(), to: f.loc(), capture: false, player});
        });
    }).message(
      `{{ player }} designates {{ figures }} at {{ locString }} to be their agent{{ s }}.`, 
      ({figures}) => ({
        locString: figures.map(f => f.square()!.locString()).join(', '),
        s: figures.length != 1 ? 's' : '',
    }),
    ),

    moveFigure: player => action({
      prompt: 'Your Move',
    }).chooseOnBoard(
      'figure',
      // () => player.influenced(),
      () => player.moveFigureFigureOptions(),
      { skipIf: 'never'},
    ).chooseOnBoard(
      'dest',
      // ({figure}) => figure.validMoves(),
      ({figure}) => figure.moveFigureDestOptions(),
      { skipIf: 'never'},
    ).message(
      `{{ player }} moves {{ role }} {{start}} to {{end}}{{ capture }}.`,
      ({figure, dest}) => ({
        role: figure.role,
        start: figure.square()!.locString(),
        end: dest.locString(),
        capture: (dest.has(Figure) ? `, capturing ${dest.first(Figure)?.role}.` : ``),
      })
    ).do(({figure, dest}) => {
      figure.moveTo({player, dest});

      if (figure.role === 'Pawn' && dest.isEdge() && !player.zoneTest(dest)) {
        game.followUp({name: 'promote'});
      }

      // cleanup action context variables
      board.playerActionName = '';
      board.actionName = '';

      // STUB figure.influence?
      if (! $.chessboard.all(Low).some((f) => !player.influenced().includes(f))) {
        game.finish(player);
      }

    }),

    resign: player => action({
      prompt: 'Are you sure?',
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
      if (!lastMove) return;

      const baby = $.chessboard.first(Pawn, (f) => (f.square()?.row == lastMove.to.row && 
                                                 f.square()?.column == lastMove.to.column));
      const dest = baby?.square();
      if (! (baby && dest)) return;

      let upgrade: Figure | undefined;

      if (order === 'skip') {
        return;
      } else if (order === 'General') {
        upgrade = $.box.first(General, {mine: true});
      } else {
        upgrade = $.box.first(Figure, {role: order});
      }

      if (!upgrade) return;

      upgrade.putInto(dest);
      upgrade.agentOf = player;
      baby.putInto($.box);
      board.amendMove({promote: upgrade});
      // board.amendMove({promote: upgrade.role});
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
