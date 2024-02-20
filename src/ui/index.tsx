import React from 'react';
import { render, numberSetting } from '@boardzilla/core';
import { default as setup, SkirmaPlayer, Space, Figure, Square } from '../game/index.js';

import './style.scss';
import '@boardzilla/core/index.css';

render(setup, {
  layout: board => {
    board.appearance({
      render: () => 
      <style>
      --player0-color: {board.game.players[0].color};
      --player1-color: {board.game.players[1].color};
      </style>
    });

    board.layout('box', {
      // aspectRatio: 5,
      area: {
        top: 5,
        left: 30,
        width: 40,
        height: 10,
      },
    });

    board.layout('chessboard', {
      aspectRatio: 1,
      area: {
        top: 18,
        left: 14,
        width: 72,
        height: 72,
      },
    });

    board.all(Space, 'box').appearance({
      render: () =>
      <div style={{
        '--player0-color': board.game.players[0].color,
        '--player1-color': board.game.players[1].color,
      } as React.CSSProperties }>Skirma</div>
      ,

      info: () => 
      <>
      <div> Skirma is a territory control game. 
      </div><div>
      The goal is to either eliminate your opponent (there is no checkmate) 
      or have influence over all the low pieces. At any given time, your 
      "high" pieces describe your zone of potential influence. 
      </div><div>
      You can always move your high pieces (Queens and Generals, if you get any); they belong to you.
      You can also move whichever piece you moved most recently, which is called your agent.
      And you can move any pieces in your zone that aren't opponent agents or high pieces.
      </div><div>
      Most pieces move like in Chess, with a few small exceptions. Pawns aren't stuck to one side of
      the conflict, so they also aren't stuck facing one direction. They promote if they are moved 
      to <em>any</em> edge of the board, outside your zone. They cannot become Queens - you only get the two you
      start with, so use them wisely. They can promote to "General" - a high piece that moves like 
      either a knight or a king.
      </div><div>
      And it's a harsh world, with little mercy. Any piece can take any piece - regardless of 
      who owns it or has influence over it. The small mercy? A Queen will never capture another Queen.
      </div><div>
      Enjoy!
      </div>
      </>
    })

    board.all(Space, 'box').all(Figure).appearance({
      render: () => null
    })

    board.all(Space, 'box').layout(Figure, {
      aspectRatio: 1,
    })

    board.all(Space, 'chessboard').appearance({
      render: () => null
    })

    board.all(Space, 'chessboard').layout(Square, {
      aspectRatio: 1,
    })

    board.layout(Space, {
      gap: 1,
      margin: 1
    });

    board.all(Space).layout(Figure, {
      gap: 1,
      margin: .25,
    });

    // square display logic
    board.all(Square).forEach(s => {
      s.gridparity = s.gridparity || ['even', 'odd'].at(((s.row!) + (s.column!))%2)!;

      const zones = s.inZones();
      let zoneColor: string = '';
      let zoneTop: string = '';
      let zoneBottom: string = '';
      let zoneLeft: string = '';
      let zoneRight: string = '';

      if (zones.length) { 
        const cmrf = (s:string, p:SkirmaPlayer, i:number) => 
          `color-mix(in oklch shorter hue, ${p.color} ${100*(1/(i+1))}%, ${s || '#8888'} ${100*((i)/(i+1))}%)`;

        zoneColor = zones.reduce(cmrf, "#8888");
        zoneTop    = zones.filter(p => s.row === p.zone()?.top)?.reduce(cmrf, "");
        zoneBottom = zones.filter(p => s.row === p.zone()?.bottom)?.reduce(cmrf, "");
        zoneLeft   = zones.filter(p => s.column === p.zone()?.left)?.reduce(cmrf, "");
        zoneRight  = zones.filter(p => s.column === p.zone()?.right).reduce(cmrf, "");
      }

      let move = board.lastMove();
      let traceColor = '';
      let attention = '';
      let alarm = false;

      // in N>2p, will need a differentmechanism to see other "recent" moves. 
      if (move && s.row === move?.from.row && s.column === move?.from.column) {
        traceColor = move.player.color;
        // traceFigure = move.figure;     // figure that out later
      } else if (move && s.row === move?.to.row && s.column === move?.to.column) {
        attention = move?.player.color;
        alarm = move?.capture;
      }

      s.appearance({
        render: () => {
          // if (zoneColor) {
            return (
              <div className="ColorMule" style={{
                '--zone-color'  : zoneColor,
                '--zone-top'    : zoneTop,
                '--zone-bottom' : zoneBottom,
                '--zone-left'   : zoneLeft,
                '--zone-right'  : zoneRight,
                '--trace-color' : traceColor,
                '--attn-color'  : attention,
                '--alarm'       : alarm,
              } as React.CSSProperties }>
              </div>
            );
          // } else {
          //   return (
          //     <div className="ColorMule" style={{
          //       '--trace-color' : traceColor,
          //       '--attn-color'  : attention,
          //       '--alarm'       : alarm,
          //     }}>
          //     </div>
          //   );
          //   // return (<div>{ sq.locString() }</div>);
          // }
        }
      });
    });

    // figure display logic
    board.all(Figure).forEach(f => {
      const cpm = {'Q': 9819, 'R': 9814, 'B': 9815, 'N': 9816, 'P': 9817, 'G': 9733};
      let codePoint = cpm[f.name as keyof typeof cpm];

      if (f.agentOf && (f.rank === 'low')) codePoint += 6;

      const icon = String.fromCodePoint(codePoint);

      f.appearance({
        render: () =>
          <div className="ColorMule" style={{
            '--agent-color': f.agentOf?.color
          } as React.CSSProperties }>{icon}</div>
      });
    });

    // board.all(Square).appearance({
    //   render: (sq) => {
    //     if (sq.zoneColor) {
    //       return (
    //         <div className="ColorMule" style={{
    //           '--zone-color'  : sq.zoneColor,
    //           '--zone-top'    : sq.zoneTop,
    //           '--zone-bottom' : sq.zoneBottom,
    //           '--zone-left'   : sq.zoneLeft,
    //           '--zone-right'  : sq.zoneRight,
    //           '--trace-color' : sq.traceColor,
    //           '--attn-color'  : sq.attention,
    //           '--alarm'       : sq.alarm,
    //         }}>
    //         </div>
    //       );
    //     } else {
    //       return (
    //         <div className="ColorMule" style={{
    //           '--trace-color' : sq.traceColor,
    //           '--attn-color'  : sq.attention,
    //           '--alarm'       : sq.alarm,
    //         }}>
    //         </div>
    //       );
    //       // return (<div>{ sq.locString() }</div>);
    //     }
    //   }
    // });

    // board.all(Figure).appearance({
    //   render: (fig) =>
    //     <div className="ColorMule" style={{
    //       '--agent-color': fig.agentOf?.color
    //     }}>
    //       {fig.icon}
    //     </div>
    // });

  }
});
