import { useTable } from "spacetimedb/react";
import { tables } from "./module_bindings";
import { Game } from "./components/stages/Game";
import { Setup } from "./components/stages/Setup";

export function App() {
    const [gameArray, isReady] = useTable(tables.current_game);

    if (!isReady) {
        return <p>Loading...</p>;
    }

    if (gameArray.length > 0) {
        return <Game game={gameArray[0]} />;
    }

    return <Setup />;
}
