import {
    tables,
    type EventContext,
    type REMOTE_MODULE,
} from "@/module_bindings";
import {
    TeamColor,
    type PieceCaptureEvent,
    type PieceType,
} from "@/module_bindings/types";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { DbConnectionImpl } from "spacetimedb";
import { useSpacetimeDB } from "spacetimedb/react";

type PieceNumber = {
    [K in PieceType["tag"]]: number | null;
};

const pieceNumber: PieceNumber = {
    Bomb: null,
    Spy: 1,
    Scout: 2,
    Miner: 3,
    Sergeant: 4,
    Lieutenant: 5,
    Captain: 6,
    Major: 7,
    Colonel: 8,
    General: 9,
    Marshal: 10,
    Flag: null,
};

function pieceDisplayName(pieceType: PieceType): string {
    if (pieceNumber[pieceType.tag]) {
        return `${pieceType.tag} (${pieceNumber[pieceType.tag]})`;
    } else {
        return pieceType.tag;
    }
}

export default function PieceCaptured({
    team,
    gameId,
}: {
    team: TeamColor;
    gameId: bigint;
}) {
    const spacetime = useSpacetimeDB();

    // const [currentAnimation, setCurrentAnimation] =
    //     useState<PieceCaptureEvent | null>(null);

    const onPieceCaptureEvent = useCallback(
        (_: EventContext, event: PieceCaptureEvent) => {
            // setCurrentAnimation(event);

            const attackerPieceName = pieceDisplayName(event.attackerPieceType);
            const defenderPieceName = pieceDisplayName(event.defenderPieceType);

            if (event.attackerTeam.tag === team.tag) {
                const winStr =
                    event.winner.tag === "Draw"
                        ? "was a draw"
                        : event.winner.tag === "Attacker"
                          ? "won"
                          : "lost";

                toast(
                    `Your ${attackerPieceName} attacked a ${defenderPieceName} and it ${winStr}`
                );
            } else {
                const winStr =
                    event.winner.tag === "Draw"
                        ? "was a draw"
                        : event.winner.tag === "Attacker"
                          ? "lost"
                          : "won";

                toast(
                    `Your ${defenderPieceName} was attacked by a ${attackerPieceName} and it ${winStr}`
                );
            }
        },
        [team.tag]
    );

    useEffect(() => {
        const conn: DbConnectionImpl<typeof REMOTE_MODULE> | null =
            spacetime.getConnection();

        let s = undefined;
        if (conn) {
            s = conn
                .subscriptionBuilder()
                .subscribe(
                    tables.piece_capture_event.where((r) => r.game.eq(gameId))
                );

            conn.db.piece_capture_event.onInsert(onPieceCaptureEvent);
        }

        return () => {
            if (conn) {
                conn.db.piece_capture_event.removeOnInsert(onPieceCaptureEvent);
            }
            if (s !== undefined) {
                s.unsubscribe();
            }
        };
    }, [gameId, spacetime, onPieceCaptureEvent]);

    return <></>;

    // if (currentAnimation === null) {
    //     return <></>;
    // }

    // return <PieceCapturedAnimation captureEvent={currentAnimation} />;
}

// function PieceCapturedAnimation({
//     captureEvent,
// }: {
//     captureEvent: PieceCaptureEvent;
// }) {
//     const depth = 5;
//     const maxHeight = depth * Math.cos((45 / 180) * Math.PI);
//     const maxWidth = depth * Math.cos(((45 * (16 / 9)) / 180) * Math.PI);

//     console.log(depth, maxHeight, maxWidth);

//     const { viewport } = useThree();

//     return (
//         <Hud renderPriority={1}>
//             <ambientLight intensity={Math.PI / 2} />
//             <spotLight
//                 position={[10, 10, 10]}
//                 angle={0.15}
//                 penumbra={1}
//                 decay={0}
//                 intensity={Math.PI}
//             />
//             <pointLight
//                 position={[-10, -10, -10]}
//                 decay={0}
//                 intensity={Math.PI}
//             />
//             <PerspectiveCamera position={[0, 0, 10]} makeDefault />
//             <Box
//                 position={[viewport.width / 2 - 1, viewport.height / 2 - 1, 0]}
//             >
//                 <FaceMaterial index={0}>front</FaceMaterial>
//                 <FaceMaterial index={1}>back</FaceMaterial>
//                 <FaceMaterial index={2}>top</FaceMaterial>
//                 <FaceMaterial index={3}>bottom</FaceMaterial>
//                 <FaceMaterial index={4}>left</FaceMaterial>
//                 <FaceMaterial index={5}>right</FaceMaterial>
//             </Box>
//             <ambientLight intensity={1} />
//             <pointLight position={[200, 200, 100]} intensity={0.5} />
//         </Hud>
//     );
//     // const springs = useSpring({
//     //     from: {
//     //         defenderX: 0,
//     //         defenderY: -(maxHeight + 2),
//     //         attackerX: maxWidth + 2,
//     //         attackerY: 0,
//     //     },
//     //     to: [
//     //         {
//     //             defenderX: 0,
//     //             defenderY: 0,
//     //             attackerX: 0,
//     //             attackerY: 0,
//     //         },
//     //     ],
//     // });

//     return (
//         <>
//             {/* <Piece
//                 piece={captureEvent.attackerPieceType}
//                 team={captureEvent.attackerTeam}
//                 position-x={1}
//                 position-y={-1}
//                 position-z={5}
//             /> */}
//             {/* <Piece
//                 piece={captureEvent.attackerPieceType}
//                 team={captureEvent.attackerTeam}
//                 position-x={springs.attackerX}
//                 position-y={springs.attackerY}
//                 position-z={depth}
//             />
//             <Piece
//                 piece={captureEvent.defenderPieceType}
//                 team={
//                     captureEvent.attackerTeam.tag === "Red"
//                         ? TeamColor.Blue
//                         : TeamColor.Red
//                 }
//                 position-x={springs.defenderX}
//                 position-y={springs.defenderY}
//                 position-z={depth}
//             /> */}
//         </>
//     );
// }

// function FaceMaterial({ children, index, ...props }) {
//     return (
//         <meshStandardMaterial
//             attach={`material-${index}`}
//             color={"orange"}
//             {...props}
//         ></meshStandardMaterial>
//     );
// }
