import type { PieceType, TeamColor } from "@/module_bindings/types";
import { to, type AnimatedProps } from "@react-spring/three";
import type { Vector3Like } from "three";
import { type Euler as EulerLike } from "@react-three/fiber";
import { HexToPosition } from "@/lib/utils";
import Piece from "./Piece";
import { useBoardInfo } from "@/lib/boardInfo";

export default function BoardPiece({
    team,
    piece,
    rotation,
    column,
    row,
    offset,
}: AnimatedProps<{
    team?: TeamColor;
    piece?: PieceType;
    offset?: Vector3Like;
    column: number;
    row: number;
    rotation?: EulerLike;
}>) {
    const boardInfo = useBoardInfo();
    const offsetToZeroX = boardInfo.width / 2;
    const offsetToZeroZ = boardInfo.height / 2;

    const hexOffset = to([column, row] as const, (c, r) => {
        return HexToPosition({ col: c, row: r }, boardInfo.hexSize);
    });

    const positionX = to(
        [hexOffset, offset?.x ?? 0] as const,
        (o, x) => boardInfo.position.x + (o.x - offsetToZeroX) + x
    );
    const positionY = to(
        [offset?.y ?? 0] as const,
        (y) => boardInfo.position.y + y
    );
    const positionZ = to(
        [hexOffset, offset?.z ?? 0] as const,
        (o, z) => boardInfo.position.z - (o.y - offsetToZeroZ) + z
    );

    return (
        <Piece
            rotation={rotation}
            position={{ x: positionX, y: positionY, z: positionZ }}
            team={team}
            piece={piece}
        />
    );
}