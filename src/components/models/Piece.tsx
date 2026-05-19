import { TeamColor, type PieceType } from "@/module_bindings/types";
import { useLoader, type Euler as EulerLike } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TextureLoader, type Vector3Like } from "three";
import { Suspense } from "react";
import { animated, type AnimatedProps } from "@react-spring/three";


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

export default function Piece({
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
