const Board = lazy(() => import("@/components/models/Board"))
const BoardPiece = lazy(() => import("@/components/models/BoardPiece"))
import type { BoardInfo } from "@/lib/boardInfo";
import { positionToHex } from "@/lib/utils";
import { reducers } from "@/module_bindings";
import type {
    HexPosition,
    PieceType,
    PublicPiece,
    TeamColor,
} from "@/module_bindings/types";
import { useSpring } from "@react-spring/three";
import type { ThreeEvent } from "@react-three/fiber";
import {
    lazy,
    Suspense,
    useCallback,
    type Dispatch,
    type SetStateAction,
} from "react";
import { toast } from "sonner";
import { useReducer } from "spacetimedb/react";
import { Euler, Vector2 } from "three";

function GamePiece({
    team,
    hexPosition,
    pieceType,
    selected,
}: {
    team: TeamColor;
    pieceType?: PieceType;
    selected: boolean;
    hexPosition: HexPosition;
}) {
    const springs = useSpring({
        positionY: selected ? 1 : 0,
        column: hexPosition.col,
        row: hexPosition.row,
    });

    return (
        <BoardPiece
            piece={pieceType}
            column={springs.column}
            row={springs.row}
            team={team}
            offset={{ x: 0, y: springs.positionY, z: 0 }}
            rotation={new Euler(0, team.tag === "Blue" ? Math.PI : 0, 0)}
        />
    );
}

export default function GameBoard({
    team,
    currentTurn,
    pieces,
    selectedPiece,
    setSelectedPiece,
}: {
    team: TeamColor;
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
        [
            currentTurn.tag,
            movePiece,
            pieces,
            selectedPiece,
            setSelectedPiece,
            team.tag,
        ]
    );

    return (
        <Board
            columns={14}
            rows={14}
            hexSize={1}
            texture={"board.png"}
            onClick={boardOnClick}
        >
            {pieces.map((piece) => {
                return (
                    <Suspense key={piece.id}>
                        <GamePiece
                            team={piece.team}
                            selected={piece.id === selectedPiece}
                            hexPosition={piece.position}
                            pieceType={piece.pieceType}
                        />
                    </Suspense>
                );
            })}
        </Board>
    );
}
