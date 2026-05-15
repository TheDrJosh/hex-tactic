use log::info;
use spacetimedb::ReducerContext;

use crate::{
    game::{Game, game, quit},
    types::TeamColor,
};

#[spacetimedb::reducer]
pub fn keep_alive_check(ctx: &ReducerContext, game: Game) {
    // info!(
    //     "keep alive check {} Red({}), Blue({})",
    //     game.id, game.red_player_keep_alive, game.blue_player_keep_alive
    // );

    let game = if !game.red_player_keep_alive && game.red_player_present {
        quit(ctx, &game, TeamColor::Red)
    } else {
        Some(game)
    };

    let game = if let Some(game) = &game
        && !game.blue_player_keep_alive
        && game.blue_player_present
    {
        quit(ctx, game, TeamColor::Blue)
    } else {
        game
    };

    if let Some(game) = game {
        ctx.db.game().id().update(Game {
            red_player_keep_alive: false,
            blue_player_keep_alive: false,
            ..game
        });
    }
}

#[spacetimedb::reducer]
fn keep_alive(ctx: &ReducerContext) {
    if let Ok((game, team)) = Game::current(&ctx.as_read_only()) {
        info!("keep alive {} {:?}", game.id, team);

        match team {
            TeamColor::Red => {
                ctx.db.game().id().update(Game {
                    red_player_keep_alive: true,
                    ..game
                });
            }
            TeamColor::Blue => {
                ctx.db.game().id().update(Game {
                    blue_player_keep_alive: true,
                    ..game
                });
            }
        }
    }
}
