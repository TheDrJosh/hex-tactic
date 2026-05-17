import { Board, type BoardInfo } from "@/components/models/Board";
import { Piece } from "@/components/models/Piece";
import { positionToHex } from "@/lib/utils";
import { reducers } from "@/module_bindings";
import type { PublicPiece, TeamColor } from "@/module_bindings/types";
import type { ThreeEvent } from "@react-three/fiber";
import {
    Suspense,
    useCallback,
    type Dispatch,
    type SetStateAction,
} from "react";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";
import { Euler, Vector2, Vector3 } from "three";

export function GameBoard({
    team,
    currentTurn,
    pieces,
    selectedPiece,
    setSelectedPiece,
}: {
    team: TeamColor,
    currentTurn: TeamColor;
    pieces: PublicPiece[];
    selectedPiece: bigint | null;
    setSelectedPiece: Dispatch<SetStateAction<bigint | null>>;
}) {
    const movePiece = useReducer(reducers.movePiece);

    const boardOnClick = useCallback(
        async (event: ThreeEvent<MouseEvent>, boardInfo: BoardInfo) => {
            if (team.tag !== currentTurn.tag) {
                setSelectedPiece(null);
                return;
            }

            const offsetToZeroX = boardInfo.width / 2;
            const offsetToZeroZ = boardInfo.height / 2;

            const hexPos = positionToHex(
                new Vector2(
                    event.point.x + offsetToZeroX,
                    -event.point.z + offsetToZeroZ
                ),
                boardInfo.hexSize
            );

            for (let i = 0; i < pieces.length; i++) {
                if (
                    pieces[i].position.col === hexPos.col &&
                    pieces[i].position.row === hexPos.row &&
                    pieces[i].team.tag === team.tag &&
                    pieces[i].pieceType?.tag !== "Bomb" &&
                    pieces[i].pieceType?.tag !== "Flag"
                ) {
                    setSelectedPiece(pieces[i].id);
                    return;
                }
            }

            if (selectedPiece !== null) {
                try {
                    await movePiece({ id: selectedPiece, position: hexPos });
                } catch {
                    toast("Invalid Move!");
                }
                setSelectedPiece(null);
            }
        },
        [currentTurn.tag, movePiece, pieces, selectedPiece, setSelectedPiece, team.tag]
    );

    return (
        <Board
            columns={14}
            rows={14}
            hexSize={1}
            texture={"board.png"}
            onClick={(e, b) => boardOnClick(e, b)}
        >
            {pieces.map((piece) => {
                return (
                    <Suspense key={piece.id}>
                        <Piece
                            piece={piece.pieceType}
                            hexPosition={piece.position}
                            team={piece.team}
                            offset={
                                new Vector3(
                                    0,
                                    selectedPiece === piece.id ? 1 : 0,
                                    0
                                )
                            }
                            rotation={
                                new Euler(
                                    0,
                                    piece.team.tag === "Blue" ? Math.PI : 0,
                                    0
                                )
                            }
                        />
                    </Suspense>
                );
            })}
        </Board>
    );
}
