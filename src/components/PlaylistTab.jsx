import { memo, useState } from "react";
import YouTubePlayer from "./YouTubePlayer";
import Playlist from "./Playlist";
import PlaylistInput from "./PlaylistInput";
import "./PlaylistTab.css";

const PlaylistTab = memo(() => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="playlist-tab">
            <div className="playlist-tab-container">
                <div
                    className={`main-content ${isSidebarOpen ? "sidebar-open" : ""}`}
                >
                    <div className="player-section">
                        <YouTubePlayer />
                        <PlaylistInput />
                    </div>
                </div>

                <div
                    className={`playlist-sidebar ${isSidebarOpen ? "open" : "closed"}`}
                >
                    <Playlist />
                </div>

                <button
                    className="sidebar-toggle"
                    onClick={toggleSidebar}
                    title={
                        isSidebarOpen
                            ? "플레이리스트 숨기기"
                            : "플레이리스트 보기"
                    }
                >
                    {isSidebarOpen ? "▶" : "◀"}
                </button>
            </div>
        </div>
    );
});

PlaylistTab.displayName = "PlaylistTab";

export default PlaylistTab;
