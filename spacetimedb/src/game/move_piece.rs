use spacetimedb::{ReducerContext, SpacetimeType, Table};

use crate::{
    game::{BoardPiece, CurrentGameError, Game, board_piece, game},
    types::{HexPosition, InvalidPositionError, PieceType, TeamColor},
    user::{User, user},
};

#[derive(Debug, thiserror::Error)]
pub enum MovePieceError {
    #[error("{0}")]
    CurrentGame(#[from] CurrentGameError),

    #[error("{0}")]
    InvalidPosition(#[from] InvalidPositionError),

    #[error("pieces does not found")]
    PiecesNotFound,

    #[error("invalid move")]
    InvalidMove,
}

#[spacetimedb::table(accessor = piece_capture_event, public, event)]
pub struct PieceCaptureEvent {
    #[primary_key]
    pub game: u64,

    pub attacker_team: TeamColor,

    pub piece: u64,
    pub piece_type: PieceType,

    pub attacked_piece: u64,
    pub attacked_piece_type: PieceType,

    winner: PieceWinner,
}

#[derive(SpacetimeType)]
pub enum PieceWinner {
    Attacker,
    Attacked,
    Draw,
}

//TODO - Fix jump over lakes
//TODO - Double check all positible moves

#[spacetimedb::reducer]
fn move_piece(ctx: &ReducerContext, id: u64, position: HexPosition) -> Result<(), MovePieceError> {
    position.validate()?;
    let (game, team) = Game::current(&ctx.as_read_only())?;

    if team != game.current_turn
        || !game.started
        || !game.red_player_present
        || !game.blue_player_present
        || game.winner.is_some()
    {
        return Err(MovePieceError::InvalidMove);
    }

    let piece = ctx
        .db
        .board_piece()
        .id()
        .find(id)
        .filter(|piece| piece.game == game.id && piece.team == team)
        .ok_or(MovePieceError::PiecesNotFound)?;

    if piece.position == position {
        return Err(MovePieceError::InvalidMove);
    }

    let attacked_piece = ctx
        .db
        .board_piece()
        .game()
        .filter(game.id)
        .find(|attacked_piece| attacked_piece.position == position);

    if let Some(attacked_piece) = &attacked_piece
        && attacked_piece.team == team
    {
        return Err(MovePieceError::InvalidMove);
    }

    // Check if valid move

    // invalid tiles

    // water
    if (6..=8).contains(&position.row)
        && ((3..=5).contains(&position.col) || (9..=11).contains(&position.row))
    {
        return Err(MovePieceError::InvalidMove);
    }

    //outside
    if position.row < 0 || position.row >= 15 || position.col < 0 || position.col >= 15 {
        return Err(MovePieceError::InvalidMove);
    }

    // move set

    let column_dif = position.col - piece.position.col;
    let column_dist = column_dif.abs();
    let row_dif = position.row - piece.position.row;
    let row_dist = row_dif.abs();

    match piece.piece_type {
        PieceType::Bomb | PieceType::Flag => {
            return Err(MovePieceError::InvalidMove);
        }
        PieceType::Scout => {
            let jumped_positions: Vec<_> = if column_dist == row_dist {
                // angle

                (1..column_dist)
                    .map(|i| HexPosition {
                        col: piece.position.col + i * column_dif.signum(),
                        row: piece.position.row + i * row_dif.signum(),
                    })
                    .collect()
            } else if column_dist == 0 && row_dist % 2 == 0 {
                // straight

                (2..row_dist)
                    .filter(|i| i % 2 == 0)
                    .map(|i| HexPosition {
                        col: piece.position.col,
                        row: piece.position.row + i * row_dif.signum(),
                    })
                    .collect()
            } else if column_dist * 3 == row_dist {
                // angle corner

                (1..column_dist)
                    .map(|i| HexPosition {
                        col: piece.position.col + i * column_dif.signum(),
                        row: piece.position.row + i * row_dif.signum() * 3,
                    })
                    .collect()
            } else if column_dist % 2 == 0 && row_dist == 0 {
                // straight corner

                (2..column_dist)
                    .filter(|i| i % 2 == 0)
                    .map(|i| HexPosition {
                        col: piece.position.col + i * column_dif.signum(),
                        row: piece.position.row,
                    })
                    .collect()
            } else {
                return Err(MovePieceError::InvalidMove);
            };

            let jumps_piece = ctx
                .db
                .board_piece()
                .game()
                .filter(game.id)
                .any(|piece| jumped_positions.contains(&piece.position));

            if jumps_piece {
                return Err(MovePieceError::InvalidMove);
            }
        }
        _ => {
            let valid_angled = column_dist == 1 && row_dist == 1;
            let valid_strait = column_dist == 0 && row_dist == 2;

            if !(valid_strait || valid_angled) {
                return Err(MovePieceError::InvalidMove);
            }
        }
    }

    // update piece

    ctx.db
        .board_piece()
        .id()
        .update(BoardPiece { position, ..piece });

    // if attacking delete the looser and send event

    let game = if let Some(attacked_piece) = attacked_piece {
        let win_type = match (piece.piece_type, attacked_piece.piece_type) {
            (PieceType::Spy, PieceType::Marshal) => {
                ctx.db.board_piece().id().delete(attacked_piece.id);
                PieceWinner::Attacker
            }
            (PieceType::Miner, PieceType::Bomb) => {
                ctx.db.board_piece().id().delete(piece.id);
                ctx.db.board_piece().id().delete(attacked_piece.id);
                PieceWinner::Draw
            }
            (_, PieceType::Bomb) => {
                ctx.db.board_piece().id().delete(piece.id);
                ctx.db.board_piece().id().delete(attacked_piece.id);
                PieceWinner::Draw
            }
            (piece_type, attacked_piece_type) => {
                match piece_type.rank().cmp(&attacked_piece_type.rank()) {
                    std::cmp::Ordering::Less => {
                        ctx.db.board_piece().id().delete(piece.id);
                        PieceWinner::Attacked
                    }
                    std::cmp::Ordering::Equal => {
                        ctx.db.board_piece().id().delete(piece.id);
                        ctx.db.board_piece().id().delete(attacked_piece.id);
                        PieceWinner::Draw
                    }
                    std::cmp::Ordering::Greater => {
                        ctx.db.board_piece().id().delete(attacked_piece.id);
                        PieceWinner::Attacker
                    }
                }
            }
        };

        ctx.db.piece_capture_event().insert(PieceCaptureEvent {
            game: game.id,
            attacker_team: team,
            piece: piece.id,
            piece_type: piece.piece_type,
            attacked_piece: attacked_piece.id,
            attacked_piece_type: attacked_piece.piece_type,
            winner: win_type,
        });

        if attacked_piece.piece_type == PieceType::Flag {
            let (user_ident, _) = game.get_player(team);
            let user = ctx.db.user().identity().find(user_ident).unwrap();
            let (attacked_user_ident, _) = game.get_player(team.other());
            let attacked_user = ctx.db.user().identity().find(attacked_user_ident).unwrap();

            ctx.db.user().identity().update(User {
                games_won: user.games_won + 1,
                ..user
            });

            ctx.db.user().identity().update(User {
                games_loss: attacked_user.games_loss + 1,
                ..attacked_user
            });

            ctx.db.game().id().update(Game {
                winner: Some(team),
                ..game
            })
        } else {
            game
        }
    } else {
        game
    };

    // update current turn

    ctx.db.game().id().update(Game {
        current_turn: game.current_turn.other(),
        ..game
    });

    Ok(())
}
