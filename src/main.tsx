import ReactDOM from "react-dom/client";
import { StrictMode } from "react";
import { SpacetimeDBProvider } from "spacetimedb/react";
import { DbConnection, type ErrorContext } from "./module_bindings";
import type { Identity } from "spacetimedb";
import { ThemeProvider } from "./components/theme-provider";
import Header from "./components/Header";
import { Toaster } from "./components/ui/sonner";

const HOST = import.meta.env.VITE_SPACETIMEDB_HOST ?? "ws://localhost:3000";
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? "react-ts";
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;

import "./index.css";
import { App } from "./app";

const onConnect = (_conn: DbConnection, identity: Identity, token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
    console.log(
        "Connected to SpacetimeDB with identity:",
        identity.toHexString()
    );
};

const onDisconnect = () => {
    console.log("Disconnected from SpacetimeDB");
};

const onConnectError = (_ctx: ErrorContext, err: Error) => {
    console.log("Error connecting to SpacetimeDB:", err);
};

export const connectionBuilder = DbConnection.builder()
    .withUri(HOST)
    .withDatabaseName(DB_NAME)
    .withToken(localStorage.getItem(TOKEN_KEY) || undefined)
    .onConnect(onConnect)
    .onDisconnect(onDisconnect)
    .onConnectError(onConnectError);

const rootElement = document.getElementById("root")!;

if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <StrictMode>
            <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
                <ThemeProvider>
                    <div className="">
                        <Header />
                        <div className="px-6 py-2">
                            <App />
                        </div>

                        <Toaster />
                    </div>
                </ThemeProvider>
            </SpacetimeDBProvider>
        </StrictMode>
    );
}
