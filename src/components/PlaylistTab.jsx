import React from "react";
import YouTubePlayer from "./YouTubePlayer";
import Playlist from "./Playlist";
import PlaylistInput from "./PlaylistInput";
import "./PlaylistTab.css";

const PlaylistTab = React.memo(() => {
    return (
        <div className="playlist-tab">
            <div className="playlist-tab-container">
                <div className="player-section">
                    <YouTubePlayer />
                    <PlaylistInput />
                </div>
                <div className="playlist-section">
                    <Playlist />
                </div>
            </div>
        </div>
    );
});

PlaylistTab.displayName = "PlaylistTab";

export default PlaylistTab;
