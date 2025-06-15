import React from "react";
import "./App.css";
import ChzzkChat from "./components/ChzzkChat";

// props가 변경되지 않으면 리렌더링하지 않음
const App = React.memo(() => {
    return (
        <main className="container">
            <h1>치지직 스트리밍 어시스턴트</h1>
            <ChzzkChat />
        </main>
    );
});

// 디스플레이 이름 설정
App.displayName = "App";

export default App;
