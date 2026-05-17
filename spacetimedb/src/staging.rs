use spacetimedb::{Identity, ReducerContext, Table, ViewContext, view};

use crate::types::{HexPosition, InvalidPositionError, PieceCount, PieceType};

#[spacetimedb::table(accessor = staging_piece)]
pub struct StagingPiece {
    #[primary_key]
    #[auto_inc]
    pub id: u64,

    #[index(btree)]
    pub user: Identity,

    pub position: HexPosition,

    pub piece_type: PieceType,
}

#[derive(Debug, thiserror::Error)]
pub enum SetPieceError {
    #[error("{0}")]
    InvalidPosition(#[from] InvalidPositionError),

    #[error("out of piece")]
    OutOfPiece,
}

#[spacetimedb::reducer]
pub fn staging_set_piece(
    ctx: &ReducerContext,
    pos: HexPosition,
    piece_type: Option<PieceType>,
) -> Result<(), SetPieceError> {
    pos.validate()?;

    let at_pos = ctx
        .db
        .staging_piece()
        .user()
        .filter(ctx.sender())
        .find(|piece| piece.position == pos);

    if let Some(piece_type) = piece_type {
        if let Some(at_pos) = at_pos {
            ctx.db.staging_piece().id().delete(at_pos.id);
        }
        if pos.row >= 0 && pos.row < 6 && pos.col >= 0 && pos.col < 15 {
            let counts = PieceCount::from_staging(&ctx.as_read_only());

            if match piece_type {
                PieceType::Bomb => counts.bomb_count + 1 > PieceCount::MAX_BOMBS,
                PieceType::Spy => counts.spy_count + 1 > PieceCount::MAX_SPYS,
                PieceType::Scout => counts.scout_count + 1 > PieceCount::MAX_SCOUTS,
                PieceType::Miner => counts.miner_count + 1 > PieceCount::MAX_MINERS,
                PieceType::Sergeant => counts.sergeant_count + 1 > PieceCount::MAX_SERGEANTS,
                PieceType::Lieutenant => counts.lieutenant_count + 1 > PieceCount::MAX_LIEUTENANTS,
                PieceType::Captain => counts.captain_count + 1 > PieceCount::MAX_CAPTAINS,
                PieceType::Major => counts.major_count + 1 > PieceCount::MAX_MAJORS,
                PieceType::Colonel => counts.colonel_count + 1 > PieceCount::MAX_COLONEL,
                PieceType::General => counts.general_count + 1 > PieceCount::MAX_GENERAL,
                PieceType::Marshal => counts.marshal_count + 1 > PieceCount::MAX_MARSHAL,
                PieceType::Flag => counts.flag_count + 1 > PieceCount::MAX_FLAG,
            } {
                return Err(SetPieceError::OutOfPiece);
            }

            ctx.db.staging_piece().insert(StagingPiece {
                id: 0,
                user: ctx.sender(),
                position: pos,
                piece_type,
            });

            Ok(())
        } else {
            Err(InvalidPositionError::InvalidPosition)?
        }
    } else {
        if let Some(at_pos) = at_pos {
            ctx.db.staging_piece().delete(at_pos);
        }
        Ok(())
    }
}

#[spacetimedb::reducer]
pub fn staging_clear_piece(ctx: &ReducerContext) {
    ctx.db.staging_piece().user().delete(ctx.sender());
}

#[view(accessor = staging_pieces, public)]
fn staging_pieces(ctx: &ViewContext) -> Vec<StagingPiece> {
    ctx.db.staging_piece().user().filter(ctx.sender()).collect()
}
