import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import ChzzkChat from "./components/ChzzkChat";

function App() {
    return (
        <main className="container">
            <h1>치지직 스트리밍 어시스턴트</h1>
            <ChzzkChat />
        </main>
    );
}

export default App;
