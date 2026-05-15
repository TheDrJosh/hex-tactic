use std::time::Duration;

use spacetimedb::{
    Identity, ReducerContext, ScheduleAt, SpacetimeType, Table, ViewContext, rand::Rng, view,
};

use crate::{
    game::keep_alive::keep_alive_check,
    staging::staging_piece,
    types::{HexPosition, PieceCount, PieceType, TeamColor},
    user::{User, user},
};

pub mod keep_alive;
pub mod move_piece;

#[spacetimedb::table(accessor = game, public, scheduled(keep_alive_check))]
#[derive(Clone)]
pub struct Game {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    //TODO - Change to Option<Identity> once https://github.com/clockworklabs/SpacetimeDB/pull/4949 merges
    #[index(btree)]
    pub red_player_identity: Identity,
    pub red_player_present: bool,
    pub red_player_keep_alive: bool,

    //TODO - Change to Option<Identity> once https://github.com/clockworklabs/SpacetimeDB/pull/4949 merges
    #[index(btree)]
    pub blue_player_identity: Identity,
    pub blue_player_present: bool,
    pub blue_player_keep_alive: bool,

    pub scheduled_at: ScheduleAt,

    pub current_turn: TeamColor,

    started: bool,

    winner: Option<TeamColor>,
}

impl Game {
    pub fn current(ctx: &ViewContext) -> Result<(Game, TeamColor), CurrentGameError> {
        Self::find(ctx, ctx.sender()).ok_or(CurrentGameError::NotInGame)
    }

    pub fn find(ctx: &ViewContext, identity: Identity) -> Option<(Game, TeamColor)> {
        ctx.db
            .game()
            .red_player_identity()
            .filter(identity)
            .find(|game| game.red_player_present || identity == Identity::ZERO)
            .map(|current_game| (current_game, TeamColor::Red))
            .or_else(|| {
                Some((
                    ctx.db
                        .game()
                        .blue_player_identity()
                        .filter(identity)
                        .find(|game| game.blue_player_present || identity == Identity::ZERO)?,
                    TeamColor::Blue,
                ))
            })
    }

    pub fn player_present(self, team: TeamColor, present: bool) -> Self {
        match team {
            TeamColor::Red => Self {
                red_player_present: present,
                ..self
            },
            TeamColor::Blue => Self {
                blue_player_present: present,
                ..self
            },
        }
    }

    pub fn update_identity(self, team: TeamColor, identity: Identity) -> Self {
        match team {
            TeamColor::Red => Self {
                red_player_identity: identity,
                ..self
            },
            TeamColor::Blue => Self {
                blue_player_identity: identity,
                ..self
            },
        }
    }

    pub fn get_player(&self, team: TeamColor) -> (Identity, bool) {
        match team {
            TeamColor::Red => (self.red_player_identity, self.red_player_present),
            TeamColor::Blue => (self.blue_player_identity, self.blue_player_present),
        }
    }
}

#[derive(SpacetimeType)]
pub struct GameInfo {
    game: Game,
    team: TeamColor,
    pieces: Vec<PublicPiece>,
}

#[derive(SpacetimeType)]
pub struct PublicPiece {
    pub id: u64,

    pub position: HexPosition,

    pub piece_type: Option<PieceType>,

    pub team: TeamColor,
}

#[view(accessor = current_game, public)]
fn current_game(ctx: &ViewContext) -> Option<GameInfo> {
    let (game, team) = Game::find(ctx, ctx.sender())?;

    let pieces: Vec<_> = ctx
        .db
        .board_piece()
        .game()
        .filter(game.id)
        .map(|piece| PublicPiece {
            id: piece.id,
            position: piece.position,
            team: piece.team,
            piece_type: (piece.team == team).then_some(piece.piece_type),
        })
        .collect();

    Some(GameInfo { game, team, pieces })
}

#[spacetimedb::table(accessor = board_piece)]
pub struct BoardPiece {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    #[index(btree)]
    pub game: u64,

    pub position: HexPosition,

    pub piece_type: PieceType,

    pub team: TeamColor,
}

#[derive(Debug, thiserror::Error)]
pub enum CurrentGameError {
    #[error("not in game")]
    NotInGame,
}

#[derive(Debug, thiserror::Error)]
pub enum JoinGameError {
    #[error("can not join new game while in a game")]
    InGame,
    #[error("not logged in")]
    NotLoggedIn,

    #[error("pieces not ready")]
    PiecesNotReady,
}

fn setup_board(ctx: &ReducerContext, game_id: u64, team: TeamColor) -> Result<(), JoinGameError> {
    if !PieceCount::from_staging(&ctx.as_read_only()).all_used() {
        return Err(JoinGameError::PiecesNotReady);
    }

    for piece in ctx.db.staging_piece().user().filter(ctx.sender()) {
        let pos = match team {
            TeamColor::Red => piece.position,
            TeamColor::Blue => HexPosition {
                col: 14 - piece.position.col,
                row: 14 - piece.position.row,
            },
        };

        ctx.db.board_piece().insert(BoardPiece {
            id: 0,
            game: game_id,
            team,
            piece_type: piece.piece_type,
            position: pos,
        });
    }

    Ok(())
}

#[spacetimedb::reducer]
pub fn join_game(ctx: &ReducerContext) -> Result<(), JoinGameError> {
    ctx.db
        .user()
        .identity()
        .find(ctx.sender())
        .ok_or(JoinGameError::NotLoggedIn)?;

    if Game::current(&ctx.as_read_only()).is_ok() {
        return Err(JoinGameError::InGame);
    }

    if let Some((waiting_game, empty_team)) = Game::find(&ctx.as_read_only(), Identity::ZERO) {
        setup_board(ctx, waiting_game.id, empty_team)?;

        let mut new_game = waiting_game
            .update_identity(empty_team, ctx.sender())
            .player_present(empty_team, true);
        new_game.started = true;

        ctx.db.game().id().update(new_game);
    } else {
        let mut rng = ctx.rng();

        let team = if rng.gen_bool(0.5) {
            TeamColor::Red
        } else {
            TeamColor::Blue
        };

        let (red_player_identity, red_player_present, blue_player_identity, blue_player_present) =
            if team == TeamColor::Red {
                (ctx.sender(), true, Identity::ZERO, false)
            } else {
                (Identity::ZERO, false, ctx.sender(), true)
            };

        let game = ctx.db.game().insert(Game {
            id: 0,

            red_player_identity,
            red_player_present,
            red_player_keep_alive: false,

            blue_player_identity,
            blue_player_present,
            blue_player_keep_alive: false,
            scheduled_at: ScheduleAt::Interval(Duration::from_secs(2).into()),

            current_turn: TeamColor::Red,
            started: false,
            winner: None,
        });

        setup_board(ctx, game.id, team)?;
    }

    Ok(())
}

fn quit(ctx: &ReducerContext, game: &Game, team: TeamColor) -> Option<Game> {
    let (user_ident, other_present) = game.get_player(team.other());
    if user_ident != Identity::ZERO {
        let user = ctx.db.user().identity().find(user_ident).unwrap();
        ctx.db.user().identity().update(User {
            games_played: user.games_played + 1,
            ..user
        });
    }

    if !other_present {
        ctx.db.game().id().delete(game.id);
        None
    } else {
        Some(
            ctx.db
                .game()
                .id()
                .update(game.clone().player_present(team, false)),
        )
    }
}

#[spacetimedb::reducer]
pub fn quit_game(ctx: &ReducerContext) {
    if let Ok((game, team)) = Game::current(&ctx.as_read_only()) {
        quit(ctx, &game, team);
    }
}
