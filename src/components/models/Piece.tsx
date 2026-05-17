import { TeamColor, type PieceType } from "@/module_bindings/types";
import { useLoader, type Euler as EulerLike } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useBoardInfo, type BoardInfo } from "./Board";
import { HexToPosition } from "@/lib/utils";
import { TextureLoader, Vector3, type Vector3Like } from "three";
import { Suspense } from "react";
import { animated, to, type AnimatedProps } from "@react-spring/three";

function piecePosition(
    column: number,
    row: number,
    offsetX: number,
    offsetY: number,
    offsetZ: number,
    boardInfo: BoardInfo
): Vector3 {
    const hexOffset = HexToPosition(
        { col: column, row: row },
        boardInfo.hexSize
    );

    const offsetToZeroX = boardInfo.width / 2;
    const offsetToZeroZ = boardInfo.height / 2;

    return new Vector3(
        boardInfo.position.x + (hexOffset.x - offsetToZeroX) + offsetX,
        boardInfo.position.y + offsetY,
        boardInfo.position.z - (hexOffset.y - offsetToZeroZ) + offsetZ
    );
}

export function Piece({
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

    const gltf = useLoader(GLTFLoader, "piece.gltf");

    const color =
        team === undefined ? "gray" : team.tag === "Red" ? "red" : "blue";

    // @ts-expect-error dont know why this is not defined in the type def
    const geometry = gltf.nodes.Piece.geometry;

    const position = to(
        [column, row, offset?.x ?? 0, offset?.y ?? 0, offset?.z ?? 0],
        (c, r, x, y, z) => {
            return piecePosition(c, r, x, y, z, boardInfo);
        }
    );

    return (
        <animated.mesh
            castShadow
            receiveShadow
            geometry={geometry}
            rotation={rotation}
            position={position}
        >
            <meshStandardMaterial color={color} />
            {piece !== undefined ? (
                <Suspense>
                    <PieceLabel piece={piece} />
                </Suspense>
            ) : undefined}
        </animated.mesh>
    );
}

function PieceLabel({ piece }: { piece: PieceType }) {
    const texture_name = piece.tag.toLocaleLowerCase() + ".png";

    const texture = useLoader(TextureLoader, texture_name);

    return (
        <mesh position={[0, 0.5, 0.3]}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial map={texture} alphaTest={0.5} />
        </mesh>
    );
}
