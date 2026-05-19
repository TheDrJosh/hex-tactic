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
import {
    useCallback,
    useEffect,
    useState,
    type Dispatch,
    type SetStateAction,
} from "react";
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

export default function usePieceCaptured(
    gameId: bigint,
    team: TeamColor
): [
    PieceCaptureEvent | null,
    Dispatch<SetStateAction<PieceCaptureEvent | null>>,
] {
    const [currentAnimation, setCurrentAnimation] =
        useState<PieceCaptureEvent | null>(null);

    const spacetime = useSpacetimeDB();

    const onPieceCaptureEvent = useCallback(
        (_: EventContext, event: PieceCaptureEvent) => {
            setCurrentAnimation(event);

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

    return [currentAnimation, setCurrentAnimation];
}
