import { TeamColor, type PieceType } from "@/module_bindings/types";
import { useLoader, type Euler as EulerLike } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useBoardInfo } from "./Board";
import { HexToPosition } from "@/lib/utils";
import { TextureLoader, type Vector3Like } from "three";
import { Suspense } from "react";
import { animated, to, type AnimatedProps } from "@react-spring/three";

export function BoardPiece({
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

export function Piece({
    team,
    piece,
    rotation,
    position,
}: AnimatedProps<{
    team?: TeamColor;
    piece?: PieceType;
    position?: Vector3Like;
    rotation?: EulerLike;
}>) {
    const gltf = useLoader(GLTFLoader, "piece.gltf");

    const color =
        team === undefined ? "gray" : team.tag === "Red" ? "red" : "blue";

    // @ts-expect-error dont know why this is not defined in the type def
    const geometry = gltf.nodes.Piece.geometry;

    return (
        <animated.mesh
            castShadow
            receiveShadow
            geometry={geometry}
            rotation={rotation}
            position-x={position?.x}
            position-y={position?.y}
            position-z={position?.z}
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
